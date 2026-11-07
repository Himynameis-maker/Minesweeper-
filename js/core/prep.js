/* [core/prep] cfg(盤面設定) -> P(ソルバ・生成器が共通で使う問題定義)。DOM非依存。
   新しい種類のルールフック(全体制約など)を足すときは、まずここで P に必要な情報を載せる。 */
/* cfg={R,C,M,ids} -> P={nb[i]=数字が数えるマス, cons=[{cells,lo,hi,src}], grp=連結成分サイズ(0=なし), gid=grpルールid, adj=上下左右, iso/iid=孤立禁止(imax=塊サイズの上限。0=上限なし), conn/cnid=手繋ぎ(adj8=8近傍), lie/lid=liar(1=各行列に正直1つ, 2=各行列に嘘1つ), w=マスごとの爆弾の重み(null=全部1)} */
function prep(cfg){const{R,C,ids}=cfg,rs=ids.map(id=>RULES[id]),nr=rs.find(r=>r.nb),nb=[];
 for(let i=0;i<R*C;i++)nb.push(nr?nr.nb(R,C,i):offs(R,C,i,D8));
 const cons=[];for(const r of rs)if(r.cons)for(const k of r.cons(R,C))cons.push({cells:k.cells,lo:k.lo,hi:k.hi,src:{t:'r',id:r.id}});
 /*[wt]*/const wr=rs.find(r=>r.wt),w=wr?[...Array(R*C)].map((_,i)=>wr.wt(R,C,i)):null;
 const gr=rs.find(r=>r.grp),lr=rs.find(r=>r.liar),adj=gr?[...Array(R*C)].map((_,i)=>offs(R,C,i,D4)):null;
 /*[iso]*/const ir=rs.find(r=>r.iso),cr=rs.find(r=>r.conn),adj8=(ir||cr)?[...Array(R*C)].map((_,i)=>offs(R,C,i,D8)):null;
 /*[probe]*/const pr=rs.find(r=>r.probe);
 /*[dragon]*/const dr=rs.find(r=>r.dragon);
 return{nb,cons,/*[dragon]*/dragon:dr?1:0,did:dr?dr.id:'',probe:pr?1:0,pid:pr?pr.id:'',grp:gr?gr.grp:0,gid:gr?gr.id:'',adj,R,C,lie:lr?(lr.liar===2?2:1):0,lid:lr?lr.id:'',/*[iso]*/iso:ir?1:0,iid:ir?ir.id:'',imax:ir&&ir.iso!==true?ir.iso:0,/*[conn]*/conn:cr?1:0,cnid:cr?cr.id:'',adj8,w}}
/* [wt] マスiの数字の真の値 = nbが指すマスの爆弾の重み付き和(wtなしなら普通の個数)。m は 0/1 配列 */
function ncount(P,m,i){let s=0;for(const j of P.nb[i])s+=m[j]*(P.w?P.w[j]:1);return s}
/* [dragon] 龍: 左端から右端まで、1列ごとに行が同じか±1の爆弾の列。m は 0/1 配列。dok=あるか / dpath=1本(マス番号の配列)。
   なければ cut=「龍が途切れる列」のマス(NG例の赤枠用) */
function dok(P,m){const R=P.R,C=P.C;let f=new Uint8Array(R),g=new Uint8Array(R);
 for(let r=0;r<R;r++)f[r]=m[r*C]?1:0;
 for(let c=1;c<C;c++){let a=0;for(let r=0;r<R;r++){const v=m[r*C+c]&&(f[r]||(r>0&&f[r-1])||(r<R-1&&f[r+1]))?1:0;g[r]=v;a|=v}
  if(!a)return false;const t=f;f=g;g=t}
 for(let r=0;r<R;r++)if(f[r])return true;return false}
function dpath(P,m){const R=P.R,C=P.C,pr=[],f=new Int16Array(R).fill(-2);let any=0;
 for(let r=0;r<R;r++)if(m[r*C]){f[r]=-1;any=1}
 const col=c=>{const o=[];for(let r=0;r<R;r++)o.push(r*C+c);return o};
 if(!any)return{ok:false,path:null,cut:col(0)};
 pr.push(f);
 for(let c=1;c<C;c++){const g=new Int16Array(R).fill(-2);any=0;
  for(let r=0;r<R;r++)if(m[r*C+c])for(const q of[r,r-1,r+1])if(q>=0&&q<R&&pr[c-1][q]!=-2){g[r]=q;any=1;break}
  if(!any)return{ok:false,path:null,cut:col(c)};
  pr.push(g)}
 let r=0;while(pr[C-1][r]==-2)r++;
 const path=[];for(let c=C-1;c>=0;c--){path.push(r*C+c);r=pr[c][r]}
 return{ok:true,path:path.reverse(),cut:[]}}
/* [grp] 爆弾の縦横連結成分(配列の配列) */
function gcomps(P,m){const N=m.length,seen=new Uint8Array(N),o=[];
 for(let i=0;i<N;i++)if(m[i]&&!seen[i]){const q=[i];seen[i]=1;for(let h=0;h<q.length;h++)for(const y of P.adj[q[h]])if(m[y]&&!seen[y]){seen[y]=1;q.push(y)}o.push(q)}
 return o}
