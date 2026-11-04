/* [core/prep] cfg(盤面設定) -> P(ソルバ・生成器が共通で使う問題定義)。DOM非依存。
   新しい種類のルールフック(全体制約など)を足すときは、まずここで P に必要な情報を載せる。 */
/* cfg={R,C,M,ids} -> P={nb[i]=数字が数えるマス, cons=[{cells,lo,hi,src}], grp=連結成分サイズ(0=なし), gid=grpルールid, adj=上下左右, lie/lid=liar} */
function prep(cfg){const{R,C,ids}=cfg,rs=ids.map(id=>RULES[id]),nr=rs.find(r=>r.nb),nb=[];
 for(let i=0;i<R*C;i++)nb.push(nr?nr.nb(R,C,i):offs(R,C,i,D8));
 const cons=[];for(const r of rs)if(r.cons)for(const k of r.cons(R,C))cons.push({cells:k.cells,lo:k.lo,hi:k.hi,src:{t:'r',id:r.id}});
 const gr=rs.find(r=>r.grp),lr=rs.find(r=>r.liar),adj=gr?[...Array(R*C)].map((_,i)=>offs(R,C,i,D4)):null;
 return{nb,cons,grp:gr?gr.grp:0,gid:gr?gr.id:'',adj,R,C,lie:lr?1:0,lid:lr?lr.id:''}}
/* [grp] 爆弾の縦横連結成分(配列の配列) */
function gcomps(P,m){const N=m.length,seen=new Uint8Array(N),o=[];
 for(let i=0;i<N;i++)if(m[i]&&!seen[i]){const q=[i];seen[i]=1;for(let h=0;h<q.length;h++)for(const y of P.adj[q[h]])if(m[y]&&!seen[y]){seen[y]=1;q.push(y)}o.push(q)}
 return o}
