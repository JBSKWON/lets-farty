import { parseMarkdown, text } from './markdown.mjs';
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value??'') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
export function checkLifecycle(documents) {
  const diagnostics=[];
  for(const [file,source] of documents) {
    const scope=/^doc\/(design|exec)\//.exec(file);
    if(!scope)continue;
    const location=/^doc\/(design|exec)\/(active|completed)\/([^/]+)\.md$/.exec(file);
    const add=(rule,message)=>diagnostics.push({file,rule,message,suggestion:'Follow doc/README.md; record real evidence and update status/location together.'});
    if(!location){add('status-location','Unexpected lifecycle document location');continue;}
    const tree=parseMarkdown(source), fields={}, headings=new Map();
    let top=true;
    for(const node of tree.children) {
      if(node.type==='heading' && node.depth>1)top=false;
      if(node.type==='heading')headings.set(text(node).toLowerCase(),node);
      if(top && node.type==='paragraph') {
        const label=node.children[0];
        if(label?.type==='strong' && text(label).endsWith(':')) fields[text(label).slice(0,-1)]=node.children.slice(1).map(text).join('').trim();
      }
    }
    if(tree.children[0]?.type!=='heading' || tree.children[0]?.depth!==1) add('metadata','Document must start with a title');
    for(const key of ['Status','Date','Updated','Next action']) if(!fields[key])add('metadata',`Missing ${key}`);
    for(const key of ['Date','Updated','Approved on','Completed on']) if(fields[key] && !validDate(fields[key]))add('metadata',`Invalid ${key} date`);
    if(validDate(fields.Date) && validDate(fields.Updated) && fields.Updated<fields.Date)add('metadata','Updated predates Date');
    const original=/^(\d{4}-\d{2}-\d{2})-/.exec(location[3])?.[1];
    if(!original || original!==fields.Date)add('metadata','Filename date must match original Date');
    const status=fields.Status?.replace(/^[^A-Za-z]+/u,'');
    if(!['In progress','Blocked','Completed'].includes(status))add('metadata','Unknown status label');
    if((location[2]==='completed')!==(status==='Completed'))add('status-location','Status does not match lifecycle directory');
    if(status==='Blocked' && !fields['Blocked by'])add('blocked-fields','Blocked work requires Blocked by');
    if(status==='Completed' && location[1]==='design' && (!fields['Approved by'] || !validDate(fields['Approved on']) || !fields['Approval scope']))add('approval-fields','Completed design requires approver, approval date, and scope');
    if(status==='Completed' && location[1]==='exec') {
      const sectionHasContent=key=>{
        const node=headings.get(key);if(!node)return false;
        const index=tree.children.indexOf(node);
        return tree.children[index+1] && tree.children[index+1].type!=='heading';
      };
      if(!validDate(fields['Completed on']) || !['outcomes','verification evidence','deferred work'].every(sectionHasContent))add('completion-fields','Completed plan requires completion date, outcomes, verification evidence, and deferred work disposition');
    }
  }
  return diagnostics;
}
