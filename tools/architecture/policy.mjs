const normalize = path => path.replaceAll('\\', '/');
const entry = /\/index\.(?:[cm]?[jt]s|[jt]sx)$/;
export function classify(path) {
  path = normalize(path);
  const shared = /^(packages\/(contracts|scoring)|apps\/(mobile|share))\//.exec(path);
  if (shared) return { area: shared[2] ?? shared[3] };
  const module = /^services\/api\/src\/modules\/([^/]+)\/(.+)$/.exec(path);
  if (module) return { area: module[2].startsWith('transport/') ? 'transport' : 'business', domain: module[1], public: entry.test(path) && !module[2].includes('/') };
  const api = /^services\/api\/src\/(adapters|runtime)\//.exec(path);
  if (api) return {area:api[1] === 'adapters' ? 'adapter' : 'runtime'};
  return {area:'unknown'};
}
const allowed = {
  contracts: ['contracts'], scoring: ['scoring','contracts'],
  mobile: ['mobile','contracts','scoring'], share: ['share','contracts'],
  business: ['business','contracts','scoring'], transport: ['transport','business','contracts'],
  adapter: ['adapter','business','contracts'], runtime: ['runtime','adapter','business','transport','contracts','scoring'],
};
export const diagnostic = (file, rule, message, suggestion, line) => ({file,rule,message,suggestion,...(line ? {line} : {})});
export function checkGraph(graph) {
  const result = [];
  const add = (file,rule,message,suggestion) => result.push(diagnostic(file,rule,message,suggestion));
  for (const file of graph.files) if(classify(file).area === 'unknown') add(normalize(file),'unclassified-source','Source has no defined boundary','Move it into a documented area or review and add its policy.');
  const local = [];
  for (const edge of graph.edges) {
    const from = normalize(edge.from), to = edge.to && normalize(edge.to);
    const source = classify(from), dest = to && classify(to);
    if(edge.unresolved) add(from,'unresolved',`Cannot resolve ${edge.specifier}`,'Fix the path, package manifest, or consumer tsconfig.');
    if(edge.external) {
      const rule = source.area==='scoring' ? 'portable-runtime' : source.area==='business' ? 'business-implementation' : source.area==='contracts' && !/^zod(?:\/|$)/.test(edge.specifier) ? 'contracts-external' : undefined;
      if(rule) add(from,rule,`External runtime dependency ${edge.specifier} is forbidden here`,'Inject a provider, use a shared type, or review a narrowly scoped allowlist change.');
      continue;
    }
    if(!to || edge.unresolved) continue;
    local.push({from,to});
    if(!allowed[source.area]?.includes(dest.area)) add(from,'boundary',`${source.area} cannot depend on ${dest.area}: ${to}`,'Use contracts, an injected provider, or runtime composition.');
    if(source.domain && dest.domain && source.domain !== dest.domain) add(from,'cross-domain',`Domain ${source.domain} imports ${dest.domain}`,'Pass the other domain operation through runtime composition.');
    if(dest.area==='business' && (!source.domain || source.area==='transport') && !dest.public) add(from,'module-private',`Private module file imported: ${to}`,'Import the module index entry instead.');
    if(dest.area==='transport' && source.area==='runtime' && !entry.test(to)) add(from,'module-private',`Private transport file imported: ${to}`,'Import transport/index instead.');
    if(source.area==='scoring' && dest.area==='contracts' && !edge.typeOnly) add(from,'scoring-contract-types','Portable scoring consumes contracts only as shared types','Use import type for the shared schema-derived type.');
    if(source.area==='adapter' && dest.area==='business' && !edge.typeOnly) add(from,'adapter-provider-types',`Adapter imports business implementation: ${to}`,'Use import type through the module index for provider interfaces.');
  }
  // Ignore test-only cycles, while retaining all test edges for boundary checks.
  const production = path => !/(?:^|\/)(?:__tests__|test|tests)\/|\.(?:test|spec)\.[^.]+$/.test(path);
  const adjacency = new Map();
  for(const {from,to} of local) if(production(from) && production(to)) {
    if(!adjacency.has(from)) adjacency.set(from,[]);
    adjacency.get(from).push(to);
  }
  const done = new Set(), visiting = new Set();
  function visit(file) {
    if(visiting.has(file)) { add(file,'cycle','Production dependency cycle detected','Break the cycle using contracts or injected interfaces.'); return; }
    if(done.has(file)) return;
    visiting.add(file);
    for(const target of adjacency.get(file) ?? []) visit(target);
    visiting.delete(file);done.add(file);
  }
  for(const file of adjacency.keys()) visit(file);
  return result;
}
