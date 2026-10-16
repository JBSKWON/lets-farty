import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const ignored=new Set(['node_modules','.git','.venv','__pycache__','coverage','dist','build','.superpowers']);
export async function listFiles(root,directories) {
  const files=[];
  async function walk(directory) {
    if(!existsSync(directory))return;
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      if(ignored.has(entry.name) || entry.isSymbolicLink())continue;
      const path=resolve(directory,entry.name);
      if(entry.isDirectory())await walk(path);else if(entry.isFile())files.push(relative(root,path).replaceAll('\\','/'));
    }
  }
  for(const directory of directories)if(!ignored.has(directory))await walk(resolve(root,directory));
  return files.sort();
}
