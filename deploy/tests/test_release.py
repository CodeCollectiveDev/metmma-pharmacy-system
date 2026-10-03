"""Exercise deployment/backup failure handling without real cloud credentials."""
import gzip
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

DEPLOY = Path(__file__).resolve().parents[1]
RELEASE_ID = 'a' * 40 + '-123-1'


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.bin = self.path / 'bin'
        self.bin.mkdir()
        self.log = self.path / 'calls'
        self.env = dict(os.environ, PATH=f'{self.bin}:{os.environ["PATH"]}', CALLS=str(self.log))

    def mock(self, name, script):
        target = self.bin / name
        target.write_text('#!/bin/bash\nset -eu\n' + script)
        target.chmod(0o755)

    def run_script(self, script, *args):
        return subprocess.run(['bash', str(script), *args], env=self.env, text=True, capture_output=True)

    def prepare_deploy(self):
        root = self.path / 'root'
        root.mkdir()
        for name in ['.env', 'backend.env', 'backup.env']:
            (root / name).write_text('test-placeholder\n')
        old = root / 'releases' / 'old'
        old.mkdir(parents=True)
        (root / 'current').symlink_to(old)
        incoming = self.path / 'incoming'
        incoming.mkdir()
        for name in ['compose.yml', 'Caddyfile', 'deploy.sh', 'backup-now.sh']:
            shutil.copy(DEPLOY / name, incoming)
        archive = gzip.compress(b'image fixture')
        (incoming / 'images.tar.gz').write_bytes(archive)
        (incoming / 'images.tar.gz.sha256').write_text(hashlib.sha256(archive).hexdigest() + '  images.tar.gz\n')
        self.env['METMMA_DEPLOY_ROOT'] = str(root)
        self.mock('docker', '''echo "$*" >> "$CALLS"
if [[ $1 == load ]]; then cat >/dev/null; fi
if [[ -n ${FAIL_MATCH:-} && "$*" == *"$FAIL_MATCH"* ]]; then exit 1; fi
if [[ "$*" == *'printenv API_DOMAIN' ]]; then echo api.example.test; fi
''')
        self.mock('curl', 'echo "curl $*" >> "$CALLS"\n[[ ${FAIL_CURL:-0} == 0 ]]\n')
        return root, incoming

    def test_success_promotes_only_after_backup_migration_and_health(self):
        root, incoming = self.prepare_deploy()
        result = self.run_script(incoming / 'deploy.sh', RELEASE_ID)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((root / 'current').resolve().name, RELEASE_ID)
        self.assertEqual((root / 'previous').resolve().name, 'old')
        calls = self.log.read_text()
        self.assertLess(calls.index('stop api'), calls.index('-T backup'))
        self.assertLess(calls.index('-T backup'), calls.index('npm run migrate'))
        self.assertLess(calls.index('npm run migrate'), calls.index('up -d --wait'))
        self.assertNotIn('npm run db:init', calls)

    def test_release_failures_keep_previous_pointer_and_stop_api(self):
        for failure in ['-T backup', 'npm run migrate', 'up -d --wait', 'curl']:
            with self.subTest(failure=failure):
                # Give each failure an independent filesystem and call log.
                with tempfile.TemporaryDirectory() as folder:
                    previous_path, previous_env, previous_log = self.path, self.env, self.log
                    self.path = Path(folder)
                    self.log = self.path / 'calls'
                    self.env = dict(previous_env, CALLS=str(self.log))
                    try:
                        root, incoming = self.prepare_deploy()
                        self.env.update(FAIL_CURL='1' if failure == 'curl' else '0', FAIL_MATCH='' if failure == 'curl' else failure)
                        result = self.run_script(incoming / 'deploy.sh', RELEASE_ID)
                        self.assertNotEqual(result.returncode, 0)
                        self.assertEqual((root / 'current').resolve().name, 'old')
                        calls = self.log.read_text()
                        self.assertTrue(calls.rstrip().endswith('stop api'))
                        if failure == '-T backup':
                            self.assertNotIn('npm run migrate', calls)
                    finally:
                        self.path, self.env, self.log = previous_path, previous_env, previous_log

    def test_invalid_archive_fails_before_stopping_api(self):
        root, incoming = self.prepare_deploy()
        (incoming / 'images.tar.gz').write_bytes(b'corrupt')
        result = self.run_script(incoming / 'deploy.sh', RELEASE_ID)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())
        self.assertEqual((root / 'current').resolve().name, 'old')

    def test_initialization_is_explicit(self):
        _, incoming = self.prepare_deploy()
        result = self.run_script(incoming / 'deploy.sh', RELEASE_ID, 'true')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('npm run db:init', self.log.read_text())

    def prepare_backup(self):
        self.env.update(BACKUP_DATABASE_URL='postgresql://user:secret@neon.example/db',
                        R2_ENDPOINT='https://account.r2.cloudflarestorage.com', R2_BUCKET='test-backups',
                        AWS_ACCESS_KEY_ID='test', AWS_SECRET_ACCESS_KEY='test',
                        BACKUP_DIR=str(self.path / 'backups'))
        self.mock('pg_dump', '''[[ ${FAIL_DUMP:-0} == 0 ]] || exit 1
[[ $PGSSLMODE == verify-full ]]
for arg in "$@"; do if [[ $arg == --file=* ]]; then printf 'dump fixture' > "${arg#--file=}"; fi; done
''')
        self.mock('pg_restore', 'exit 0\n')
        self.mock('aws', '''echo "$*" >> "$CALLS"
[[ ${FAIL_UPLOAD:-0} == 0 ]] || exit 1
if [[ "$*" == *head-object* ]]; then echo "${REMOTE_SIZE:-12}"; fi
''')

    def test_backup_verifies_upload_and_preserves_checksum(self):
        self.prepare_backup()
        result = self.run_script(DEPLOY / 'backup/backup.sh')
        self.assertEqual(result.returncode, 0, result.stderr)
        directory = self.path / 'backups'
        self.assertTrue((directory / 'last-success').exists())
        self.assertEqual(len(list(directory.glob('*.dump.sha256'))), 1)
        self.assertIn('head-object', self.log.read_text())

    def test_upload_failure_preserves_local_dump_and_reports_failure(self):
        self.prepare_backup()
        self.env['FAIL_UPLOAD'] = '1'
        result = self.run_script(DEPLOY / 'backup/backup.sh')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(list((self.path / 'backups').glob('*.dump'))), 1)
        self.assertFalse((self.path / 'backups/last-success').exists())

    def test_dump_failure_never_uploads(self):
        self.prepare_backup()
        self.env['FAIL_DUMP'] = '1'
        result = self.run_script(DEPLOY / 'backup/backup.sh')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())

    def test_remote_size_mismatch_fails(self):
        self.prepare_backup()
        self.env['REMOTE_SIZE'] = '1'
        result = self.run_script(DEPLOY / 'backup/backup.sh')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.path / 'backups/last-success').exists())


if __name__ == '__main__':
    unittest.main()
