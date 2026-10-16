import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

function checksFor(files) {
  if(files.some(file=>/^(tools\/|scripts\/|\.githooks\/|package(?:-lock)?\.json$|\.node-version$|\.npmrc$|\.markdownlint)/.test(file)))return ['test','check:architecture','check:docs','check:harness','check:format'];
  const checks=[];
  if(files.some(file=>/^(apps|services|packages)\//.test(file)))checks.push('check:architecture');
  if(files.some(file=>file.endsWith('.md') || file.startsWith('doc/') || file.startsWith('.cursor/')))checks.push('check:docs','check:harness','check:format');
  return checks;
}
export async function runPreCommit(root) {
  root=resolve(root);
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
  const files=git('diff','--cached','--name-only','--no-renames','-z','--diff-filter=ACMD').split('\0').filter(Boolean);
  const checks=checksFor(files);
  if(!checks.length)return 0;
  const snapshot=await mkdtemp(join(tmpdir(),'lets-farty-staged-'));
  try {
    git('checkout-index','--all','--prefix='+snapshot+'/');
    if(existsSync(join(root,'node_modules')))await symlink(join(root,'node_modules'),join(snapshot,'node_modules'),'dir');
    // Git exports repository-local variables to hooks. Do not leak them into
    // snapshot checks or their disposable Git fixture repositories.
    const env={...process.env};
    for(const key of git('rev-parse','--local-env-vars').trim().split('\n'))delete env[key];
    for(const check of checks) {
      console.log(`[pre-commit] staged snapshot: ${check}`);
      const status=await new Promise(resolve=>{
        const child=spawn('npm',['run',check],{cwd:snapshot,env,stdio:'inherit',shell:false});
        child.once('error',error=>{console.error(error.message);resolve(1);});
        child.once('close',code=>resolve(code===0?0:1));
      });
      if(status)return 1;
    }
    return 0;
  } finally {await rm(snapshot,{recursive:true,force:true});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {process.exitCode=await runPreCommit(process.cwd());}
  catch(error){console.error(`[pre-commit] ${error.message}`);process.exitCode=1;}
}
