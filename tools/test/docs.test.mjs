import test from 'node:test';
import assert from 'node:assert/strict';
import { symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkDocs } from '../docs/check.mjs';
import { checkLifecycle } from '../docs/lifecycle.mjs';
import { withRepository } from './fixtures.mjs';

const filename='doc/design/active/2026-10-16-example.md';
const metadata=(status='In progress',extra='')=>`# Example\n\n**Status:** ${status}\n\n**Date:** 2026-10-16\n\n**Updated:** 2026-10-16\n\n**Next action:** Continue.\n\n${extra}`;
async function diagnostics(files) {let ds;await withRepository(files,async root=>{ds=await checkDocs(root);});return ds;}
async function hasRule(files,rule){const ds=await diagnostics(files);assert.ok(ds.some(d=>d.rule===rule),JSON.stringify(ds));}
test('current lifecycle metadata passes with or without emoji',()=>{
  for(const status of ['In progress','🟡 In progress','Blocked','🔴 Blocked'])assert.deepEqual(checkLifecycle(new Map([[filename,metadata(status,status.includes('Blocked')?'**Blocked by:** Owner decision.':'')]])),[]);
});
test('living reference files need no lifecycle metadata',()=>assert.deepEqual(checkLifecycle(new Map([['AGENTS.md','# Instructions']])),[]));
test('missing metadata is rejected',()=>hasRule({[filename]:'# Example'},'metadata'));
test('metadata inside code is not treated as document metadata',()=>hasRule({[filename]:'# Example\n\n```md\n'+metadata()+'\n```'},'metadata'));
for(const [location,status] of [['active','Completed'],['completed','In progress'],['completed','Blocked']])test(`reject ${status} in ${location}`,()=>hasRule({[filename.replace('/active/','/'+location+'/')]:metadata(status)},'status-location'));
test('blocked work names its blocker',()=>hasRule({[filename]:metadata('Blocked')},'blocked-fields'));
test('completed design needs approval fields',()=>hasRule({[filename.replace('/active/','/completed/')]:metadata('Completed')},'approval-fields'));
test('completed design with approval fields passes',()=>assert.deepEqual(checkLifecycle(new Map([[filename.replace('/active/','/completed/'),metadata('Completed','**Approved by:** Owner\n\n**Approved on:** 2026-10-16\n\n**Approval scope:** Tooling only.')]])),[]));
test('completed execution needs outcomes and verification',()=>hasRule({[filename.replace('design/active','exec/completed')]:metadata('Completed')},'completion-fields'));
test('completed execution with evidence sections passes',()=>assert.deepEqual(checkLifecycle(new Map([[filename.replace('design/active','exec/completed'),metadata('Completed','**Completed on:** 2026-10-16\n\n## Outcomes\n\nTooling added.\n\n## Verification evidence\n\nChecks passed.\n\n## Deferred work\n\nApp shell remains separate.')]])),[]));
for(const date of ['2026-02-30','2026-13-01','yesterday'])test(`reject invalid date ${date}`,()=>hasRule({[filename]:metadata().replace('**Date:** 2026-10-16','**Date:** '+date)},'metadata'));
test('updated cannot predate creation',()=>hasRule({[filename]:metadata().replace('**Updated:** 2026-10-16','**Updated:** 2026-10-15')},'metadata'));
test('unexpected lifecycle directory fails',()=>hasRule({'doc/design/drafts/example.md':metadata()},'status-location'));
test('valid local, reference, image, fragment and encoded links pass',async()=>assert.deepEqual(await diagnostics({
  'README.md':'# Start\n\n[plain](other.md#repeat)\n\n[reference][target]\n\n[target]: other.md#repeat-1\n\n![image](picture.svg)\n\n[spaces](space%20name.md)\n\n[self](#start)\n\n[explicit](other.md#anchor)\n\n[external](https://invalid.invalid)\n\n`[ignored](missing)`\n\n```md\n[ignored](missing)\n```',
  'other.md':'# Repeat\n\n## Repeat\n\n<a id="anchor"></a>', 'space name.md':'# Space', 'picture.svg':'<svg/>',
}),[]));
for(const link of ['[broken](missing.md)','![broken](missing.png)','[moved][target]\n\n[target]: old.md'])test(`missing file ${link}`,()=>hasRule({'README.md':'# Start\n\n'+link},'missing-file'));
test('missing anchor fails',()=>hasRule({'README.md':'# Start\n\n[x](other.md#absent)','other.md':'# Other'},'missing-anchor'));
test('undefined reference fails',()=>hasRule({'README.md':'# Start\n\n[broken][missing]'},'undefined-reference'));
test('case-sensitive target fails when case differs',()=>hasRule({'README.md':'# Start\n\n[x](Other.md)','other.md':'# Other'},'missing-file'));
test('symlink escape fails visibly',async()=>{
  await withRepository({'README.md':'# Start\n\n[x](escape.md)'},async root=>{
    await symlink('/etc/hosts',join(root,'escape.md'));
    assert.ok((await checkDocs(root)).some(d=>d.rule==='outside-root'));
  });
});
test('docs CLI exposes violation and success exit codes',async()=>{
  const cli=fileURLToPath(new URL('../docs/check.mjs',import.meta.url));
  await withRepository({'README.md':'# Start\n\n[x](missing.md)'},async root=>{
    const r=spawnSync(process.execPath,[cli,'--root',root],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/missing-file/);
  });
  await withRepository({'README.md':'# Start'},async root=>assert.equal(spawnSync(process.execPath,[cli,'--root',root]).status,0));
});
test('inline code contributes to GitHub heading anchors',async()=>assert.deepEqual(await diagnostics({
  'README.md':'# Start\n\n[guide](guide.md#install-npm-ci)', 'guide.md':'# Install `npm ci`',
}),[]));
test('escaped reference examples are ordinary text',async()=>assert.deepEqual(await diagnostics({
  'README.md':'# Start\n\n\\[example\\]\\[missing\\]',
}),[]));
test('commented HTML cannot create a phantom anchor',()=>hasRule({
  'README.md':'# Start\n\n[guide](guide.md#phantom)', 'guide.md':'# Guide\n\n<!-- <a id="phantom"></a> -->',
},'missing-anchor'));
test('script text cannot create a phantom anchor',()=>hasRule({
  'README.md':'# Start\n\n[guide](guide.md#phantom)', 'guide.md':'# Guide\n\n<script>const text = \'<a id="phantom"></a>\';</script>',
},'missing-anchor'));
