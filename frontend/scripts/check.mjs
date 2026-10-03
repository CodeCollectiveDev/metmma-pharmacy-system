import {readdirSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {parse,compileScript,compileTemplate} from '@vue/compiler-sfc'
let count=0
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(path.endsWith('.vue')){const source=readFileSync(path,'utf8');const {descriptor,errors}=parse(source,{filename:path});if(errors.length)throw errors[0];let script;if(descriptor.script||descriptor.scriptSetup){script=compileScript(descriptor,{id:path});execFileSync(process.execPath,['--check','--input-type=module'],{input:script.content,stdio:'pipe'})}const result=compileTemplate({source:descriptor.template?.content||'',filename:path,id:path,compilerOptions:{bindingMetadata:script?.bindings}});if(result.errors.length)throw result.errors[0];count++}else if(path.endsWith('.js')){execFileSync(process.execPath,['--check',path],{stdio:'pipe'});count++}}}
walk('src');console.info(`Checked syntax/templates in ${count} JavaScript and Vue files. This is not static type checking.`)
