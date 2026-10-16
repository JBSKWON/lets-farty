import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runPreCommit } from '../harness/pre-commit.mjs';
import { withRepository } from './fixtures.mjs';

const checker=`const fs=require('node:fs');
if(!fs.existsSync('README.md'))process.exit(1);
for(const name of fs.readdirSync('.').filter(n=>n.endsWith('.md'))){if(fs.readFileSync(name,'utf8').includes('BROKEN'))process.exit(1);}`;
async function repository(run) {
  await withRepository({
    'README.md':'# Good\n', 'check.cjs':checker,
    'package.json':JSON.stringify({private:true,scripts:Object.fromEntries(['test','check:docs','check:harness','check:format','check:architecture'].map(name=>[name,'node check.cjs']))}),
  },async root=>{
    const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
    git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('add','.');git('commit','-qm','baseline');
    await run(root,git);
  });
}
test('empty staging area skips checks',()=>repository(async root=>assert.equal(await runPreCommit(root),0)));
test('an unstaged fix cannot hide a broken staged document',()=>repository(async(root,git)=>{
  await writeFile(join(root,'README.md'),'BROKEN\n');git('add','README.md');
  await writeFile(join(root,'README.md'),'# Good\n');
  assert.equal(await runPreCommit(root),1);
}));
test('an unstaged broken document does not fail a valid staged snapshot',()=>repository(async(root,git)=>{
  await writeFile(join(root,'README.md'),'# Good staged update\n');git('add','README.md');
  await writeFile(join(root,'README.md'),'BROKEN\n');
  assert.equal(await runPreCommit(root),0);
}));
test('staged deletions still trigger documentation checks',()=>repository(async(root,git)=>{
  git('rm','README.md');assert.equal(await runPreCommit(root),1);
}));
test('filenames containing spaces are checked intact',()=>repository(async(root,git)=>{
  await writeFile(join(root,'guide with spaces.md'),'BROKEN\n');git('add','guide with spaces.md');
  assert.equal(await runPreCommit(root),1);
}));
