import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
const parser=unified().use(remarkParse).use(remarkGfm);
export const parseMarkdown=source=>parser.parse(source);
export const text=node=>['code','inlineCode'].includes(node.type)?'':(node.value??node.children?.map(text).join('')??'');
export function visit(node,callback) {callback(node);for(const child of node.children??[])visit(child,callback);}
