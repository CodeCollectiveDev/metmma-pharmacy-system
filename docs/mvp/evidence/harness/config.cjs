const {resolve}=require('node:path');
if(process.env.MVP_BENCH_FIXTURE!=='disposable')throw new Error('Set MVP_BENCH_FIXTURE=disposable only after creating a separate synthetic database. These scripts change/delete fixture data.');
module.exports={sourceRoot:resolve(__dirname,'../../../..'),browserTools:process.env.MVP_BROWSER_TOOLS || '/tmp/metmma-browser-tools',benchDatabaseUrl:process.env.MVP_BENCH_DATABASE_URL || 'postgresql://mvp_test:mvp_local_test_only@127.0.0.1:55432/metmma_test',fixtureSecret:process.env.MVP_BENCH_JWT_SECRET || 'local-test-secret-at-least-32-characters'};
