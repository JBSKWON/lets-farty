import { readFile } from 'node:fs/promises';
import { existsSync, statSync, realpathSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseMarkdown, visit, text } from '../docs/markdown.mjs';
import { listFiles } from './files.mjs';

export const requiredDirectories=['doc/design/active','doc/design/completed','doc/exec/active','doc/exec/completed','doc/generated','doc/product-specs','doc/references'];
export const requiredFiles=['AGENTS.md','ARCHITECTURE.md','CLAUDE.md','README.md','CONTRIBUTING.md','doc/README.md','doc/core-beliefs.md','doc/QUALITY_SCORE.md','doc/DESIGN.md','doc/FRONTEND.md','doc/SECURITY.md','doc/DEPLOYMENT.md','doc/PRODUCT_SENSE.md','doc/RELIABILITY.md','doc/PLANS.md','doc/tech-debt-tracker.md','doc/product-specs/index.md','doc/references/harness-template.md'];
export async function checkHarness(root) {
  root=realpathSync(root);
  const result=[];
  const add=(file,rule,message,suggestion)=>result.push({file,rule,message,suggestion});
  for(const directory of requiredDirectories)if(!existsSync(resolve(root,directory)) || !statSync(resolve(root,directory)).isDirectory())add(directory,'harness-directory','Missing harness directory','Restore the project-specific documentation layout in doc/README.md.');
  for(const file of requiredFiles) {
    const path=resolve(root,file);
    if(!existsSync(path) || !statSync(path).isFile()){add(file,'harness-file','Missing required harness reference','Restore and populate this document using the template mapping.');continue;}
    const body=await readFile(path,'utf8');
    if(!body.trim())add(file,'harness-content','Required harness reference is empty','Populate this entry point with current project guidance.');
    if(/\{\{[A-Z][A-Z0-9_]*\}\}/.test(body))add(file,'template-placeholder','Unfilled template placeholder','Replace it with observed project facts or an explicit pending decision.');
  }
  const index=resolve(root,'doc/README.md');
  if(existsSync(index)) {
    const indexed=new Set(),definitions=new Map();
    const tree=parseMarkdown(await readFile(index,'utf8'));
    visit(tree,node=>{if(node.type==='definition')definitions.set(node.identifier.toLowerCase(),node.url);});
    visit(tree,node=>{
      const url=node.type==='link'?node.url:node.type==='linkReference'?definitions.get(node.identifier.toLowerCase()):undefined;
      if(url && !/^[a-z]+:/i.test(url))indexed.add(relative(root,resolve(root,'doc',decodeURIComponent(url.split('#')[0]))).replaceAll('\\','/'));
    });
    for(const file of await listFiles(root,['doc/design','doc/exec']))if(file.endsWith('.md') && !indexed.has(file))add(file,'harness-index','Lifecycle document is missing from the documentation index','Add a real link in doc/README.md and preserve its actual approval/completion state.');
  }
  for(const file of await listFiles(root,['doc/generated']))if(file.endsWith('.md')) {
    const body=await readFile(resolve(root,file),'utf8');
    let source;
    for(const node of parseMarkdown(body).children)if(node.type==='paragraph' && node.position.start.offset<500 && node.children[0]?.type==='strong' && text(node.children[0])==='Source:')source=node.children.slice(1).map(child=>child.value??text(child)).join('').trim();
    const path=source && resolve(root,source);
    if(!body.startsWith('# ') || !path || !existsSync(path) || !realpathSync(path).startsWith(root+sep))add(file,'generated-source','Generated document needs a title and an existing in-repository Source field in its first 500 characters','Regenerate from the producer and add **Source:** `repo/relative/source` near the top.');
  }
  return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const args=process.argv.slice(2);
    if(args.length && (args.length!==2 || args[0]!=='--root'))throw new Error('Usage: structure.mjs [--root PATH]');
    const diagnostics=await checkHarness(resolve(args[1]??process.cwd()));
    for(const d of diagnostics)console.error(`${d.file} [${d.rule}] ${d.message}; Fix: ${d.suggestion}`);
    if(!diagnostics.length)console.log('Harness structure, indexes, and generated-source checks passed.');
    process.exitCode=diagnostics.length?1:0;
  }catch(error){console.error(`[harness] ${error.message}`);process.exitCode=1;}
}
