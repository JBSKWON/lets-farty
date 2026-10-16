import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, relative, dirname, isAbsolute } from 'node:path';
import { cruise } from 'dependency-cruiser';
import ts from 'typescript';

const extensions = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const ignored = new Set(['node_modules','.git','dist','build','coverage','.expo']);
export async function readGraph(root) {
  root = resolve(root);
  const files = [];
  async function walk(directory) {
    if(!existsSync(directory)) return;
    for(const item of await readdir(directory,{withFileTypes:true})) {
      if(ignored.has(item.name)) continue;
      const path=resolve(directory,item.name);
      if(item.isSymbolicLink()) throw new Error(`Source symlinks are not supported: ${path}`);
      if(item.isDirectory()) await walk(path); else if(extensions.test(item.name)) files.push(relative(root,path).replaceAll('\\','/'));
    }
  }
  for(const area of ['apps','services','packages']) await walk(resolve(root,area));
  const groups=new Map();
  for(const file of files) {
    let directory=dirname(resolve(root,file)), config;
    while(directory===root || directory.startsWith(root+'/')) {
      if(existsSync(resolve(directory,'tsconfig.json'))) {config=resolve(directory,'tsconfig.json');break;}
      if(directory===root)break;
      directory=dirname(directory);
    }
    if(!groups.has(config)) groups.set(config,[]);
    groups.get(config).push(file);
  }
  const edges=[];
  const canonical = path => relative(root,isAbsolute(path)?path:resolve(process.cwd(),path)).replaceAll('\\','/');
  for(const [config,inputs] of groups) {
    let tsConfig;
    if(config) {
      const read=ts.readConfigFile(config,ts.sys.readFile);
      if(read.error) throw new Error(`Invalid tsconfig: ${config}`);
      // Parse extends and relative paths with TypeScript, not a competing JSON parser.
      const parsed=ts.parseJsonConfigFileContent(read.config,ts.sys,dirname(config),undefined,config);
      const errors=parsed.errors.filter(e=>![18002,18003,5101].includes(e.code));
      if(errors.length) throw new Error(`Invalid tsconfig: ${ts.flattenDiagnosticMessageText(errors[0].messageText,' ')}`);
      tsConfig=parsed;
    }
    const result=await cruise(inputs.map(f=>resolve(root,f)),{
      baseDir:process.cwd(), outputType:'json', tsPreCompilationDeps:true,
      doNotFollow:{path:'node_modules'}, ...(config?{tsConfig:{fileName:config}}:{}),
    },{bustTheCache:true,exportsFields:['exports'],conditionNames:['import','require','node','default'],extensions:['.ts','.tsx','.mts','.cts','.js','.jsx','.mjs','.cjs','.json']},{tsConfig});
    const data=typeof result.output==='string'?JSON.parse(result.output):result.output;
    const inputSet=new Set(inputs);
    for(const module of data.modules) {
      const from=inputs.find(file=>resolve(root,file)===resolve(process.cwd(),module.source)) ?? canonical(module.source);
      if(!inputSet.has(from)) continue;
      for(const d of module.dependencies) {
        const external=d.coreModule || d.dependencyTypes.includes('core') || /(?:^|\/)node_modules\//.test(d.resolved);
        edges.push({from,to:external?undefined:canonical(d.resolved),specifier:d.module,external,unresolved:!!d.couldNotResolve,typeOnly:!!d.typeOnly || d.dependencyTypes.includes('type-only')});
      }
    }
  }
  return {files:files.sort(),edges};
}
