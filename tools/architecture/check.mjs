import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readGraph } from './graph.mjs';
import { checkGraph } from './policy.mjs';
import { checkSource } from './source-checks.mjs';

export async function checkArchitecture(root) {
  const graph=await readGraph(root);
  return [...checkGraph(graph),...checkSource(root,graph.files)];
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const args=process.argv.slice(2);
    if(args.length && (args.length!==2 || args[0]!=='--root')) throw new Error('Usage: check.mjs [--root PATH]');
    const diagnostics=await checkArchitecture(resolve(args[1]??process.cwd()));
    for(const d of diagnostics) console.error(`${d.file}${d.line?':'+d.line:''} [${d.rule}] ${d.message}; ${d.suggestion}`);
    if(!diagnostics.length)console.log('Architecture check passed (fixture tests prove enforcement when product source is absent).');
    process.exitCode=diagnostics.length?1:0;
  }catch(error){console.error(`[architecture] ${error.message}`);process.exitCode=1;}
}
