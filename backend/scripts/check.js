const {readdirSync,readFileSync}=require('node:fs');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
let count=0;
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){if(entry.name==='node_modules')continue;const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(path.endsWith('.js')){execFileSync(process.execPath,['--check',path],{stdio:'pipe'});if(/^\s*debugger\s*;/m.test(readFileSync(path,'utf8')))throw new Error(`Debugger statement in ${path}`);count++;}}}
walk(process.cwd());console.info(`Checked syntax in ${count} JavaScript files.`);
