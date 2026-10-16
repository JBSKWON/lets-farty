import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { listFiles } from './files.mjs';
const sourcePattern=/\.(?:[cm]?[jt]s|[jt]sx)$/;
const defaultPairs=[['ARCHITECTURE.md','tools'],['CONTRIBUTING.md','tools'],['doc/SECURITY.md','apps'],['doc/RELIABILITY.md','services']];

function sourceComments(source,body) {
  const candidates=new Map(),literalSpans=[];
  function collect(node) {
    if(ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node))literalSpans.push([node.getStart(source),node.end]);
    for(const range of [...(ts.getLeadingCommentRanges(body,node.pos)??[]),...(ts.getTrailingCommentRanges(body,node.end)??[])])candidates.set(range.pos,range);
    for(const child of node.getChildren(source))collect(child);
  }
  collect(source);
  return [...candidates.values()].filter(range=>!literalSpans.some(([start,end])=>range.pos>=start && range.pos<end));
}

export async function scanEntropy(root,options={}) {
  const findings=[];
  const add=(category,location,message,fix)=>findings.push({category,severity:'info',location,message,fix});
  const files=(await listFiles(root,options.sourceDirs??['tools','scripts','apps','services','packages'])).filter(f=>sourcePattern.test(f));
  const selected=options.check;
  for(const file of files) {
    const body=await readFile(resolve(root,file),'utf8');
    const source=ts.createSourceFile(file,body,ts.ScriptTarget.Latest,true);
    if(!selected || selected==='sizes') {
      const count=body.trimEnd().split('\n').length;
      if(count>300)add('file-size',file,`${count} lines exceeds the template's 300-line review threshold.`,'Consider splitting by responsibility; this is a review signal, not a failure.');
    }
    if(!selected || selected==='todos') {
      for(const range of sourceComments(source,body))if(/\b(TODO|FIXME|HACK|XXX|TEMP)\b/i.test(body.slice(range.pos,range.end))) {
        const line=source.getLineAndCharacterOfPosition(range.pos).line+1;
        add('untracked-debt',`${file}:${line}`,'Debt marker in a source comment.','Resolve it or record it in doc/tech-debt-tracker.md.');
      }
    }
    if(!selected || selected==='credentials') {
      function visit(node) {
        if((ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) && node.name && /^(?:password|token|secret|apiKey)$/i.test(node.name.getText(source).replace(/["']/g,'')) && node.initializer && ts.isStringLiteralLike(node.initializer) && node.initializer.text) {
          add('credentials',`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line+1}`,'Possible hardcoded credential; literal intentionally omitted.','Review manually; use injected configuration for real credentials. This heuristic is not secret scanning.');
        }
        ts.forEachChild(node,visit);
      }
      visit(source);
    }
  }
  if(!selected || selected==='staleness') {
    const lastCommit=options.lastCommit??(file=>{
      try {return Number(execFileSync('git',['log','-1','--format=%ct','--',file],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())||undefined;}catch{return undefined;}
    });
    for(const [doc,directory] of options.docSourcePairs??defaultPairs)if(existsSync(resolve(root,doc))) {
      const sourceFiles=(await listFiles(root,[directory])).filter(f=>sourcePattern.test(f));
      const docDate=lastCommit(doc);
      const sourceDate=Math.max(0,...sourceFiles.map(file=>lastCommit(file)??0));
      if(docDate && sourceDate-docDate>7*86400)add('staleness',doc,'Mapped source has commits over seven days newer than this reference.','Review the documentation against source; commit age is a hint, not proof of drift.');
    }
  }
  return findings;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    let root=process.cwd(),check;
    const args=process.argv.slice(2);
    while(args.length){const option=args.shift(),value=args.shift();if(!value)throw new Error('Missing argument');if(option==='--root')root=resolve(value);else if(option==='--check' && ['todos','staleness','sizes','credentials'].includes(value))check=value;else throw new Error('Usage: entropy.mjs [--root PATH] [--check todos|staleness|sizes|credentials]');}
    const findings=await scanEntropy(root,{check});
    for(const f of findings)console.log(`${f.location} [${f.category}] ${f.message} Fix: ${f.fix}`);
    console.log(`Entropy scan: ${findings.length} advisory finding(s); this is not a security or quality certification.`);
  }catch(error){console.error(`[entropy] ${error.message}`);process.exitCode=1;}
}
