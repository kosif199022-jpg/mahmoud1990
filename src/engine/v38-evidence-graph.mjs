/** KOSIF v38 Evidence Graph — deterministic lineage with queued out-of-order edges. */
export const EVIDENCE_TYPES=new Set(['account','journal','document','evidence','risk','procedure','finding','adjustment','control','standard','ai_opinion','human_decision','pbc']);
function idOf(x){return String(x?.id||'').trim();}
export class EvidenceGraph{
  constructor(snapshot={}){this.nodes=new Map();this.edges=[];this.pending=[];for(const n of snapshot.nodes||[])this.upsertNode(n);for(const e of snapshot.edges||[])this.link(e);for(const e of snapshot.pending||[])this.pending.push({...e});this.flush();}
  upsertNode(node){const id=idOf(node);if(!id)throw new Error('node_id_required');const type=String(node.type||'evidence');if(!EVIDENCE_TYPES.has(type))throw new Error('unsupported_node_type');const prev=this.nodes.get(id)||{};this.nodes.set(id,{...prev,...node,id,type});this.flush();return this.nodes.get(id);}
  link(edge){const from=String(edge?.from||''),to=String(edge?.to||''),type=String(edge?.type||'supports');if(!from||!to)throw new Error('edge_endpoints_required');const e={...edge,from,to,type};if(!this.nodes.has(from)||!this.nodes.has(to)){if(!this.pending.some(x=>x.from===from&&x.to===to&&x.type===type))this.pending.push(e);return{queued:true,edge:e};}if(!this.edges.some(x=>x.from===from&&x.to===to&&x.type===type))this.edges.push(e);return{queued:false,edge:e};}
  flush(){if(!this.pending.length)return;const keep=[];for(const e of this.pending){if(this.nodes.has(e.from)&&this.nodes.has(e.to)){if(!this.edges.some(x=>x.from===e.from&&x.to===e.to&&x.type===e.type))this.edges.push(e);}else keep.push(e);}this.pending=keep;}
  neighbors(id,{direction='both',type}={}){id=String(id);return this.edges.filter(e=>(direction==='out'?e.from===id:direction==='in'?e.to===id:e.from===id||e.to===id)&&(!type||e.type===type));}
  trace(id,maxDepth=6){id=String(id);const seen=new Set([id]),queue=[{id,depth:0}],nodes=[],edges=[];while(queue.length){const cur=queue.shift();const n=this.nodes.get(cur.id);if(n)nodes.push(n);if(cur.depth>=maxDepth)continue;for(const e of this.neighbors(cur.id)){edges.push(e);const next=e.from===cur.id?e.to:e.from;if(!seen.has(next)){seen.add(next);queue.push({id:next,depth:cur.depth+1});}}}return{root:id,nodes,edges:[...new Map(edges.map(e=>[`${e.from}|${e.type}|${e.to}`,e])).values()]};}
  validate(){const orphanEdges=this.edges.filter(e=>!this.nodes.has(e.from)||!this.nodes.has(e.to));return{ok:orphanEdges.length===0,orphanEdges,pending:this.pending.length,nodeCount:this.nodes.size,edgeCount:this.edges.length};}
  snapshot(){return{nodes:[...this.nodes.values()],edges:[...this.edges],pending:[...this.pending]};}
}
export function graphFrom(snapshot){return new EvidenceGraph(snapshot);}
