import { readdir, readFile, realpath } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkLinks } from './links.mjs';
import { checkLifecycle } from './lifecycle.mjs';

export async function checkDocs(root) {
  root=await realpath(root);
  const documents=new Map(),diagnostics=[];
  async function walk(directory) {
    for(const item of await readdir(directory,{withFileTypes:true})) {
      if(['node_modules','.git','.superpowers','coverage','dist','build','.expo'].includes(item.name))continue;
      const path=resolve(directory,item.name);
      if(item.isSymbolicLink()) {
        const target=await realpath(path);
        if(!target.startsWith(root+sep))diagnostics.push({file:relative(root,path),rule:'outside-root',message:'Symlink points outside repository',suggestion:'Keep documentation inside the repository.'});
        continue;
      }
      if(item.isDirectory())await walk(path);else if(item.name.endsWith('.md'))documents.set(relative(root,path).replaceAll('\\','/'),await readFile(path,'utf8'));
    }
  }
  await walk(root);
  return [...diagnostics,...checkLinks(root,documents),...checkLifecycle(documents)];
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const args=process.argv.slice(2);
    if(args.length && (args.length!==2 || args[0]!=='--root'))throw new Error('Usage: check.mjs [--root PATH]');
    const diagnostics=await checkDocs(resolve(args[1]??process.cwd()));
    for(const d of diagnostics)console.error(`${d.file} [${d.rule}] ${d.message}; ${d.suggestion}`);
    if(!diagnostics.length)console.log('Markdown links and lifecycle checks passed.');
    process.exitCode=diagnostics.length?1:0;
  }catch(error){console.error(`[docs] ${error.message}`);process.exitCode=1;}
}
