import { existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import GithubSlugger from 'github-slugger';
import { parseMarkdown, text, visit } from './markdown.mjs';

export function checkLinks(root,documents) {
  root=realpathSync(root);
  const diagnostics=[],trees=new Map(),anchors=new Map();
  const add=(file,rule,message)=>diagnostics.push({file,rule,message,suggestion:'Correct the local path, reference, or heading anchor and update incoming links after moves.'});
  for(const [file,source] of documents) {
    const tree=parseMarkdown(source);trees.set(file,tree);
    const slugger=new GithubSlugger(), ids=new Set();
    visit(tree,node=>{
      if(node.type==='heading')ids.add(slugger.slug(text(node)));
      if(node.type==='html') for(const match of node.value.matchAll(/<a\b[^>]*\b(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/gi))ids.add(match[1]);
    });
    anchors.set(file,ids);
  }
  for(const [file,tree] of trees) {
    const definitions=new Map();
    visit(tree,node=>{if(node.type==='definition')definitions.set(node.identifier.toLowerCase(),node.url);});
    function check(url) {
      if(/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//'))return;
      let pathPart,fragment;
      try {const [path,hash]=url.split('#',2);pathPart=decodeURIComponent(path.split('?')[0]);fragment=hash===undefined?undefined:decodeURIComponent(hash);}catch{add(file,'missing-file',`Malformed local URL: ${url}`);return;}
      const absolute=pathPart ? (pathPart.startsWith('/')?resolve(root,'.'+pathPart):resolve(root,dirname(file),pathPart)):resolve(root,file);
      if(!existsSync(absolute)){add(file,'missing-file',`Missing local target: ${url}`);return;}
      const canonical=realpathSync(absolute);
      if(canonical!==root && !canonical.startsWith(root+sep)){add(file,'outside-root',`Local link escapes repository: ${url}`);return;}
      const target=relative(root,absolute).replaceAll('\\','/');
      if(fragment && /\.md$/i.test(target) && !anchors.get(target)?.has(fragment))add(file,'missing-anchor',`Missing Markdown anchor: ${url}`);
    }
    visit(tree,node=>{
      if(['link','image','definition'].includes(node.type))check(node.url);
      if(['linkReference','imageReference'].includes(node.type)) {
        const url=definitions.get(node.identifier.toLowerCase());
        if(url===undefined)add(file,'undefined-reference',`Undefined reference: ${node.identifier}`);else check(url);
      }
      // CommonMark leaves explicit undefined references as text, not linkReference nodes.
      if(node.type==='text')for(const match of node.value.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
        const key=(match[2]||match[1]).replace(/\s+/g,' ').toLowerCase();
        if(!definitions.has(key))add(file,'undefined-reference',`Undefined reference: ${key}`);
      }
    });
  }
  return diagnostics;
}
