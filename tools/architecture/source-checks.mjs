import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { classify, diagnostic } from './policy.mjs';

export function checkSource(root,files) {
  const result=[];
  for(const file of files) {
    const source=ts.createSourceFile(file,readFileSync(resolve(root,file),'utf8'),ts.ScriptTarget.Latest,true);
    const protectedArea=['scoring','business'].includes(classify(file).area);
    const add=(node,rule,message,suggestion)=>result.push(diagnostic(file,rule,message,suggestion,source.getLineAndCharacterOfPosition(node.getStart(source)).line+1));
    for(const error of source.parseDiagnostics) add(source,'syntax',ts.flattenDiagnosticMessageText(error.messageText,' '),'Fix the syntax before checking architecture.');
    function walk(node) {
      if(protectedArea && ts.isMetaProperty(node) && node.keywordToken===ts.SyntaxKind.ImportKeyword) add(node,'ambient-runtime','Ambient import.meta access','Inject configuration explicitly.');
      if(ts.isCallExpression(node)) {
        const call=node.expression;
        const loader=call.kind===ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(call) && call.text==='require');
        if(loader && (node.arguments.length!==1 || !ts.isStringLiteralLike(node.arguments[0]))) add(node,'computed-loader','Module target must be a literal','Use a statically resolvable import.');
      }
      if(ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text==='require') add(node,'computed-loader','Element-access require is forbidden','Use a statically resolvable literal import.');
      if(ts.isIdentifier(node)) {
        if(node.text==='module') add(node,'computed-loader','Module loader indirection is forbidden','Use a statically resolvable literal import.');
        if(node.text==='require' && !(ts.isCallExpression(node.parent) && node.parent.expression===node)) add(node,'computed-loader','Require indirection is forbidden','Use a literal import or require call.');
        if(['createRequire','eval','Function'].includes(node.text)) add(node,'computed-loader','Dynamic code/loading is forbidden','Use statically resolvable imports.');
        const propertyName=(ts.isPropertyAccessExpression(node.parent) && node.parent.name===node) || (ts.isPropertyAssignment(node.parent) && node.parent.name===node);
        if(protectedArea && !propertyName && ['process','fetch','globalThis','window','global'].includes(node.text)) add(node,'ambient-runtime',`Ambient runtime access: ${node.text}`,'Inject configuration or a provider explicitly.');
        if(node.text==='require' && ts.isPropertyAccessExpression(node.parent) && node.parent.name===node) add(node,'computed-loader','Object-based require is forbidden','Use a literal module import.');
      }
      ts.forEachChild(node,walk);
    }
    walk(source);
  }
  return result;
}
