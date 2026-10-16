import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checkHarness, requiredFiles, requiredDirectories } from '../harness/structure.mjs';
import { scanEntropy } from '../harness/entropy.mjs';
import { withRepository } from './fixtures.mjs';

async function harness(root) {
  for(const directory of requiredDirectories)await mkdir(join(root,directory),{recursive:true});
  for(const file of requiredFiles)await writeFile(join(root,file),file==='CLAUDE.md'?'@AGENTS.md\n':'# Reference\n');
}
test('a fully adapted harness passes structure checks',()=>withRepository({},async root=>{
  await harness(root);assert.deepEqual(await checkHarness(root),[]);
}));
test('missing required template documents are errors with fixes',()=>withRepository({},async root=>{
  const ds=await checkHarness(root);assert.ok(ds.some(d=>d.file==='doc/QUALITY_SCORE.md' && d.rule==='harness-file' && d.suggestion));
}));
test('unindexed lifecycle docs fail even when their filenames appear as code examples',()=>withRepository({},async root=>{
  await harness(root);
  const name='doc/design/active/2026-10-16-example.md';
  await writeFile(join(root,name),'# Example\n');
  await writeFile(join(root,'doc/README.md'),'# Docs\n\n`design/active/2026-10-16-example.md`\n');
  assert.ok((await checkHarness(root)).some(d=>d.rule==='harness-index' && d.file===name));
  await writeFile(join(root,'doc/README.md'),'# Docs\n\n[Example](design/active/2026-10-16-example.md)\n');
  assert.deepEqual(await checkHarness(root),[]);
}));
test('generated docs require an actual source reference, even when they have a heading',()=>withRepository({},async root=>{
  await harness(root);await writeFile(join(root,'doc/generated/api.md'),'# API\n');
  assert.ok((await checkHarness(root)).some(d=>d.rule==='generated-source'));
  await writeFile(join(root,'doc/generated/api.md'),'# API\n\n**Source:** `tools/api.mjs`\n');
  assert.ok((await checkHarness(root)).some(d=>d.rule==='generated-source'));
  await mkdir(join(root,'tools'));await writeFile(join(root,'tools/api.mjs'),'export const value=1;');
  assert.deepEqual(await checkHarness(root),[]);
}));
test('template placeholders cannot survive initialization',()=>withRepository({},async root=>{
  await harness(root);await writeFile(join(root,'ARCHITECTURE.md'),'# {{PROJECT_NAME}}\n');
  assert.ok((await checkHarness(root)).some(d=>d.rule==='template-placeholder'));
}));
test('entropy reports comment debt and large files, ignoring strings and dependencies',()=>withRepository({
  'tools/app.mjs':'// TODO: split calculation\nconst example = "FIXME";\n'+Array(301).fill('// ordinary comment').join('\n'),
  'node_modules/pkg/app.mjs':'// FIXME ignored',
},async root=>{
  const findings=await scanEntropy(root,{sourceDirs:['tools','node_modules']});
  assert.equal(findings.filter(f=>f.category==='untracked-debt').length,1);
  assert.ok(findings.some(f=>f.category==='file-size'));
  assert.ok(findings.every(f=>f.fix && !f.location.startsWith('node_modules/')));
}));
test('credential hints redact the literal and remain advisory',()=>withRepository({
  'apps/mobile/index.ts':'const token="fixture-not-a-real-credential";',
},async root=>{
  const findings=await scanEntropy(root);
  assert.ok(findings.some(f=>f.category==='credentials'));
  assert.ok(!JSON.stringify(findings).includes('fixture-not-a-real-credential'));
}));
test('staleness uses git history rather than checkout timestamps',()=>withRepository({
  'ARCHITECTURE.md':'# Architecture', 'tools/value.mjs':'export const value=1;',
},async root=>{
  const history=new Map([['ARCHITECTURE.md',1000],['tools/value.mjs',1000+9*86400]]);
  const findings=await scanEntropy(root,{sourceDirs:['tools'],docSourcePairs:[['ARCHITECTURE.md','tools']],lastCommit:path=>history.get(path)});
  assert.ok(findings.some(f=>f.category==='staleness'));
}));
test('missing product directories produce no fabricated app findings',()=>withRepository({},async root=>{
  assert.deepEqual(await scanEntropy(root),[]);
}));

test('unused reference definitions do not count as index links',()=>withRepository({},async root=>{
  await harness(root);
  const file='doc/design/active/2026-10-16-hidden.md';await writeFile(join(root,file),'# Hidden\n');
  await writeFile(join(root,'doc/README.md'),'# Docs\n\n[hidden]: design/active/2026-10-16-hidden.md\n');
  assert.ok((await checkHarness(root)).some(d=>d.rule==='harness-index'));
  await writeFile(join(root,'doc/README.md'),'# Docs\n\n[Hidden][hidden]\n\n[hidden]: design/active/2026-10-16-hidden.md\n');
  assert.deepEqual(await checkHarness(root),[]);
}));
test('empty required documents are not initialized entry points',()=>withRepository({},async root=>{
  await harness(root);await writeFile(join(root,'AGENTS.md'),'   \n');
  assert.ok((await checkHarness(root)).some(d=>d.rule==='harness-content' && d.file==='AGENTS.md'));
}));
test('debt comments after interpolated template literals remain visible',()=>withRepository({
  'tools/template.mjs':'const value = `first ${1} second`;\n// TODO: actual debt\n',
},async root=>assert.equal((await scanEntropy(root)).filter(f=>f.category==='untracked-debt').length,1)));
test('JSX text and string examples do not become debt comments',()=>withRepository({
  'apps/mobile/example.tsx':'const element = <View>// TODO example</View>;\n// TODO actual debt\n',
},async root=>assert.equal((await scanEntropy(root)).filter(f=>f.category==='untracked-debt').length,1)));
