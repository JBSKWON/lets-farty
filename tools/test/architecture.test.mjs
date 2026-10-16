import test from 'node:test';
import assert from 'node:assert/strict';
import { relative, dirname, posix, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkArchitecture } from '../architecture/check.mjs';
import { readGraph } from '../architecture/graph.mjs';
import { checkGraph } from '../architecture/policy.mjs';
import { withRepository } from './fixtures.mjs';

const paths = {
  mobile: 'apps/mobile/src/index.ts', share: 'apps/share/src/index.ts',
  contracts: 'packages/contracts/src/index.ts', scoring: 'packages/scoring/src/index.ts',
  business: 'services/api/src/modules/scoring/service.ts', ports: 'services/api/src/modules/scoring/index.ts',
  transport: 'services/api/src/modules/scoring/transport/index.ts', ranking: 'services/api/src/modules/ranking/index.ts',
  adapter: 'services/api/src/adapters/storage.ts', runtime: 'services/api/src/runtime/index.ts',
};
const target = 'export type Value = string; export const value = 1;';
function edge(from, to, form = 'import') {
  let specifier = posix.relative(posix.dirname(from), to);
  if (!specifier.startsWith('.')) specifier = './' + specifier;
  const forms = {
    import: `import { value } from '${specifier}'; console.log(value);`,
    type: `import type { Value } from '${specifier}'; export type Copy = Value;`,
    dynamic: `import('${specifier}');`, require: `const value = require('${specifier}');`,
    export: `export * from '${specifier}';`,
  };
  return { [from]: forms[form], [to]: target };
}
async function expectRule(files, rule) {
  await withRepository(files, async root => {
    const diagnostics = await checkArchitecture(root);
    assert.ok(diagnostics.some(d => d.rule === rule), JSON.stringify(diagnostics));
    for (const d of diagnostics) assert.ok(d.file && d.message && d.suggestion);
  });
}

test('empty checkout passes without product scaffolding', async () => {
  await withRepository({'README.md': '# Test'}, async root => {
    assert.deepEqual(await checkArchitecture(root), []);
    assert.deepEqual((await readGraph(root)).files, []);
  });
});
for (const [from, to, form] of [
  ['mobile','contracts'], ['mobile','scoring'], ['share','contracts'], ['scoring','contracts','type'],
  ['business','contracts'], ['business','scoring'], ['transport','ports'], ['adapter','ports','type'],
  ['runtime','ports'], ['runtime','transport'], ['runtime','adapter'], ['ports','business'],
]) test(`allowed ${from} → ${to} ${form ?? 'import'}`, async () => {
  await withRepository(edge(paths[from],paths[to],form), async root => assert.deepEqual(await checkArchitecture(root), []));
});
for (const [from,to] of [
  ['mobile','business'], ['mobile','share'], ['share','mobile'], ['share','scoring'], ['contracts','scoring'], ['contracts','business'],
  ['business','transport'], ['business','adapter'], ['business','runtime'], ['adapter','transport'], ['adapter','runtime'],
  ['transport','adapter'], ['transport','runtime'],
]) test(`forbidden ${from} → ${to}`, () => expectRule(edge(paths[from],paths[to]), 'boundary'));
for (const form of ['type','dynamic','require','export']) test(`forbidden edge through ${form}`, () => expectRule(edge(paths.mobile,paths.business,form),'boundary'));
test('cross-domain edge fails', () => expectRule(edge(paths.business,paths.ranking),'cross-domain'));
for (const from of ['runtime','transport','adapter']) test(`private module entry fails for ${from}`, () => expectRule(edge(paths[from],paths.business), 'module-private'));
test('adapters import only provider types', () => expectRule(edge(paths.adapter,paths.ports), 'adapter-provider-types'));
test('cycles fail inside a production area', () => expectRule({
  'packages/contracts/a.ts': "import './b.ts';", 'packages/contracts/b.ts': "import './a.ts';",
}, 'cycle'));
test('colocated tests obey their boundary', () => expectRule(edge(paths.business.replace('service.ts','service.test.ts'),paths.adapter),'boundary'));
for (const extension of ['ts','tsx','mts','cts','js','jsx','mjs','cjs']) test(`discovers ${extension} source`, () => expectRule(edge(paths.mobile.replace(/ts$/,extension),paths.business),'boundary'));
for (const area of ['scoring','business']) {
  for (const builtin of ['node:fs','fs/promises','https']) test(`${area} cannot import ${builtin}`, () => expectRule({[paths[area]]:`import '${builtin}';`}, area==='scoring'?'portable-runtime':'business-implementation'));
  for (const code of ['process.env.X',"process['env'].X",'import.meta.env.X','globalThis.process.env.X','fetch("x")','globalThis.fetch("x")','const p = process; p.env.X','const {fetch: request} = globalThis; request("x")']) {
    test(`${area} rejects ambient ${code}`, () => expectRule({[paths[area]]:code}, 'ambient-runtime'));
  }
}
for (const code of ['import(variable)', 'require(variable)', 'require.resolve("x")', 'const load = require; load("x")', 'module.require("x")', "import {createRequire} from 'node:module';", 'eval("require(x)")']) {
  test(`computed loader rejected: ${code}`, () => expectRule({[paths.mobile]:code}, 'computed-loader'));
}
for (const specifier of ['./missing.ts','@missing/alias','missing-package']) test(`unresolved ${specifier}`, () => expectRule({[paths.mobile]:`import '${specifier}';`}, 'unresolved'));
test('unknown project area fails visibly', () => expectRule({'apps/unknown/index.ts':target},'unclassified-source'));
test('Windows paths normalize before policy matching', () => {
  const result = checkGraph({files: [paths.mobile,paths.business].map(p=>p.replaceAll('/','\\')),edges:[{from:paths.mobile.replaceAll('/','\\'),to:paths.business.replaceAll('/','\\'),specifier:'x',external:false,unresolved:false,typeOnly:false}]});
  assert.ok(result.some(d=>d.rule==='boundary'));
});
for (const allowed of [true,false]) test(`alias resolves to ${allowed?'allowed':'forbidden'} target`, async () => {
  const to = allowed ? paths.contracts : paths.business;
  await withRepository({
    'tsconfig.json': JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@target':[to]}}}),
    [paths.mobile]: "import {value} from '@target'; console.log(value);", [to]:target,
  }, async root => {
    const graph = await readGraph(root);
    assert.ok(graph.edges.some(e=>e.to===to),JSON.stringify(graph));
    const ds = await checkArchitecture(root);
    if(allowed) assert.deepEqual(ds,[]); else assert.ok(ds.some(d=>d.rule==='boundary'),JSON.stringify(ds));
  });
});
for (const allowed of [true,false]) test(`package exports resolve to ${allowed?'allowed':'forbidden'} target`, async () => {
  const to=allowed?paths.contracts:paths.business;
  await withRepository({
    'package.json':JSON.stringify({name:'fixture-project',type:'module',exports:{'./target':'./'+to}}),
    [paths.mobile]:"import {value} from 'fixture-project/target'; console.log(value);",[to]:target,
  }, async root => {
    const graph=await readGraph(root);assert.ok(graph.edges.some(e=>e.to===to),JSON.stringify(graph));
    const ds=await checkArchitecture(root); if(allowed)assert.deepEqual(ds,[]);else assert.ok(ds.some(d=>d.rule==='boundary'),JSON.stringify(ds));
  });
});
for (const area of ['mobile','scoring','business']) test(`${area} external SDK policy`, async () => {
  const files={
    [paths[area]]:"import {value} from '@supabase/supabase-js'; console.log(value);",
    'node_modules/@supabase/supabase-js/package.json':JSON.stringify({name:'@supabase/supabase-js',main:'index.js'}),
    'node_modules/@supabase/supabase-js/index.js':'exports.value = 1;',
  };
  await withRepository(files,async root=>{
    const ds=await checkArchitecture(root);
    if(area==='mobile') assert.deepEqual(ds,[]); else assert.ok(ds.some(d=>d.rule===(area==='scoring'?'portable-runtime':'business-implementation')),JSON.stringify(ds));
  });
});
test('dependency folders and fixture data do not enter production scan',async()=>{
  await withRepository({'node_modules/foo/index.ts':"import './missing';",'tools/test/data/apps/x.ts':"import './missing';"},async root=>assert.deepEqual(await checkArchitecture(root),[]));
});
test('architecture CLI returns failure on violation and success on empty source',async()=>{
  const cli=fileURLToPath(new URL('../architecture/check.mjs',import.meta.url));
  await withRepository(edge(paths.mobile,paths.business),async root=>{
    const r=spawnSync(process.execPath,[cli,'--root',root],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/boundary/);
  });
  await withRepository({},async root=>assert.equal(spawnSync(process.execPath,[cli,'--root',root]).status,0));
  await withRepository({[paths.mobile]:"import 'missing-package';"},async root=>assert.equal(spawnSync(process.execPath,[cli,'--root',root]).status,1));
});
test('re-export barrels retain forbidden transitive edges', () => expectRule({
  ...edge(paths.mobile,'packages/contracts/src/index.ts'),
  ...edge('packages/contracts/src/index.ts',paths.business,'export'),
},'boundary'));
for(const form of ['dynamic','require'])test(`template-literal ${form} cannot bypass resolution`,()=>expectRule({
  [paths.mobile]:form==='dynamic'?"import(`../../../services/api/src/modules/scoring/service.ts`);":"require(`../../../services/api/src/modules/scoring/service.ts`);",
  [paths.business]:target,
},'boundary'));
test('scoring imports contracts as types only',()=>expectRule(edge(paths.scoring,paths.contracts),'scoring-contract-types'));
test('syntax errors fail visibly',()=>expectRule({[paths.mobile]:'const = ;'},'syntax'));
test('contracts permit an explicitly allowed schema library',async()=>{
  await withRepository({[paths.contracts]:"import {value} from 'zod'; console.log(value);",'node_modules/zod/package.json':'{"name":"zod","main":"index.js"}','node_modules/zod/index.js':'exports.value=1;'},async root=>assert.deepEqual(await checkArchitecture(root),[]));
});
test('a nested fixture root cannot hide entry-file dependencies',async()=>{
  const files=Object.fromEntries(Object.entries(edge(paths.mobile,paths.business)).map(([p,s])=>['nested/'+p,s]));
  await withRepository(files,async root=>{
    const ds=await checkArchitecture(join(root,'nested'));
    assert.ok(ds.some(d=>d.rule==='boundary'),JSON.stringify(ds));
  });
});
for(const kind of ['require','type'])test(`conditional exports obey ${kind} conditions`,async()=>{
  const name=kind==='require'?'apps/mobile/index.cjs':'apps/mobile/index.ts';
  await withRepository({
    'package.json':JSON.stringify({name:'fixture',type:'module',exports:{'./target':kind==='require'?{import:'./packages/contracts/index.cjs',require:'./services/api/src/modules/scoring/index.cjs'}:{types:'./services/api/src/modules/scoring/index.d.ts',default:'./packages/contracts/index.cjs'}}}),
    [name]:kind==='require'?"require('fixture/target');":"import type {Value} from 'fixture/target'; export type Copy=Value;",
    'packages/contracts/index.cjs':'exports.value=1;',
    'services/api/src/modules/scoring/index.cjs':'exports.value=1;',
    'services/api/src/modules/scoring/index.d.ts':'export type Value=string;',
  },async root=>assert.ok((await checkArchitecture(root)).some(d=>d.rule==='boundary')));
});
test('one consumer can mix import and require for the same conditional export',async()=>{
  await withRepository({
    'package.json':JSON.stringify({name:'fixture',type:'module',exports:{'./target':{import:'./packages/contracts/index.cjs',require:'./services/api/src/modules/scoring/index.cjs'}}}),
    [paths.mobile]:"import 'fixture/target'; require('fixture/target');",
    'packages/contracts/index.cjs':'exports.value=1;',
    'services/api/src/modules/scoring/index.cjs':'exports.value=1;',
  },async root=>{
    const graph=await readGraph(root);
    assert.ok(graph.edges.some(e=>e.to==='packages/contracts/index.cjs'));
    assert.ok(graph.edges.some(e=>e.to==='services/api/src/modules/scoring/index.cjs'));
    assert.ok((await checkArchitecture(root)).some(d=>d.rule==='boundary'));
  });
});
for(const code of ["module['require']('node:fs')","const load=module['require'].bind(module); load('node:fs');","const m=module; m['require']('node:fs');"])test(`element loader fails: ${code}`,()=>expectRule({'packages/scoring/index.cjs':code},'computed-loader'));
test('transport cannot construct an external SDK implementation',()=>expectRule({
  [paths.transport]:"import {value} from '@supabase/supabase-js'; console.log(value);",
  'node_modules/@supabase/supabase-js/package.json':'{"name":"@supabase/supabase-js","main":"index.js"}',
  'node_modules/@supabase/supabase-js/index.js':'exports.value=1;',
},'transport-implementation'));
test('transport may import a reviewed HTTP framework',async()=>{
  await withRepository({[paths.transport]:"import {value} from 'hono'; console.log(value);",'node_modules/hono/package.json':'{"name":"hono","main":"index.js"}','node_modules/hono/index.js':'exports.value=1;'},async root=>assert.deepEqual(await checkArchitecture(root),[]));
});
test('runtime cannot consume a nested private transport index',()=>expectRule(edge(paths.runtime,'services/api/src/modules/scoring/transport/private/index.ts'),'module-private'));
test('mixed type and value imports preserve both conditional targets',async()=>{
  await withRepository({
    'package.json':JSON.stringify({name:'fixture',type:'module',exports:{'./target':{types:'./services/api/src/modules/scoring/index.d.ts',import:'./packages/contracts/index.js'}}}),
    [paths.mobile]:"import type {Value} from 'fixture/target'; import {value} from 'fixture/target'; console.log(value); export type Copy=Value;",
    'packages/contracts/index.js':'export const value=1;',
    'services/api/src/modules/scoring/index.d.ts':'export type Value=string;',
  },async root=>{
    const graph=await readGraph(root);
    assert.ok(graph.edges.some(e=>e.to==='packages/contracts/index.js' && !e.typeOnly));
    assert.ok(graph.edges.some(e=>e.to==='services/api/src/modules/scoring/index.d.ts' && e.typeOnly));
    assert.ok((await checkArchitecture(root)).some(d=>d.rule==='boundary'));
  });
});
test('CJS type imports use the require branch of nested types exports',async()=>{
  await withRepository({
    'package.json':JSON.stringify({name:'fixture',type:'commonjs',exports:{'./target':{types:{import:'./packages/contracts/index.d.ts',require:'./services/api/src/modules/scoring/index.d.ts'}}}}),
    'apps/mobile/index.cts':"import type {Value} from 'fixture/target'; export type Copy=Value;",
    'packages/contracts/index.d.ts':'export type Value=string;',
    'services/api/src/modules/scoring/index.d.ts':'export type Value=string;',
  },async root=>assert.ok((await checkArchitecture(root)).some(d=>d.rule==='boundary')));
});
