/* [core/prep] cfg(盤面設定) -> P(ソルバ・生成器が共通で使う問題定義)。DOM非依存。
   新しい種類のルールフック(全体制約など)を足すときは、まずここで P に必要な情報を載せる。 */
/* cfg={R,C,M,ids} -> P={nb[i]=数字が数えるマス, cons=[{cells,lo,hi,src}], grp=連結成分サイズ(0=なし), gid=grpルールid, adj=上下左右, iso/iid=孤立禁止(imax=塊サイズの上限。0=上限なし), conn/cnid=手繋ぎ(adj8=8近傍), lie/lid=liar(1=各行列に正直1つ, 2=各行列に嘘1つ), w=マスごとの爆弾の重み(null=全部1), dragon/did=龍(1=龍 dragon:true, 2=双竜 dragon:2。双竜のときは adj8 も載る), mir/mid=鏡爆弾(ms=点対称マスの周囲8マス, o4=上下左右。鏡爆弾は盤面ごとの隠れ状態 L.sp。個数は mk=MIRN), dd=隠れ龍(1=龍の爆弾が数字に2個ぶん。dragon:true で dbl:true のとき。本物の龍は盤面ごとの隠れ状態 L.dr)} */
const MIRN=1; /* [mir] 鏡爆弾の個数。gen/solver は P.mk を見る */
function prep(cfg){const{R,C,ids}=cfg,rs=ids.map(id=>RULES[id]),nr=rs.find(r=>r.nb),nb=[];
 for(let i=0;i<R*C;i++)nb.push(nr?nr.nb(R,C,i):offs(R,C,i,D8));
 const cons=[];for(const r of rs)if(r.cons)for(const k of r.cons(R,C))cons.push({cells:k.cells,lo:k.lo,hi:k.hi,src:{t:'r',id:r.id}});
 /*[wt]*/const wr=rs.find(r=>r.wt),w=wr?[...Array(R*C)].map((_,i)=>wr.wt(R,C,i)):null;
 const gr=rs.find(r=>r.grp),lr=rs.find(r=>r.liar),adj=gr?[...Array(R*C)].map((_,i)=>offs(R,C,i,D4)):null;
 /*[dragon]*/const dr=rs.find(r=>r.dragon||r.twin); /* twin:true(双竜)は dragon:2 として扱う。registry が dragon に true しか許さないので別フック */
 /*[iso]*/const ir=rs.find(r=>r.iso),cr=rs.find(r=>r.conn),adj8=(ir||cr||(dr&&(dr.twin||dr.dragon===2)))?[...Array(R*C)].map((_,i)=>offs(R,C,i,D8)):null;
 /*[probe]*/const pr=rs.find(r=>r.probe);
 /*[mir]*/const mr=rs.find(r=>r.mir),ms=mr?[...Array(R*C)].map((_,i)=>offs(R,C,R*C-1-i,D8)):null,o4=mr?[...Array(R*C)].map((_,i)=>offs(R,C,i,D4)):null; /* 鏡爆弾: ms[i]=盤面の中心と点対称なマス(R*C-1-i)の周囲8マス。マスiの爆弾が鏡爆弾なら ms[i] の数字が+1(逆に、数字iに+1できる鏡爆弾の候補も ms[i])。o4=上下左右 */
 return{nb,cons,/*[dragon]*/dragon:dr?(dr.twin||dr.dragon===2?2:1):0,did:dr?dr.id:'',/*[dd]*/dd:dr&&dr.dragon===true&&dr.dbl?1:0,probe:pr?1:0,pid:pr?pr.id:'',grp:gr?gr.grp:0,gid:gr?gr.id:'',adj,R,C,lie:lr?(lr.liar===2?2:1):0,lid:lr?lr.id:'',/*[iso]*/iso:ir?1:0,iid:ir?ir.id:'',imax:ir&&ir.iso!==true?ir.iso:0,/*[conn]*/conn:cr?1:0,cnid:cr?cr.id:'',adj8,w,/*[mir]*/mir:mr?1:0,mid:mr?mr.id:'',ms,o4,mk:MIRN,/*[s1]*/s1:rs.some(r=>r.startOnly)?1:0}}
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

/* [dragon:2] 双竜: 爆弾の8近傍連結成分のうち1つ D が、龍H(左端→右端)と龍V(上端→下端)の和集合ちょうど(H⊄V かつ V⊄H。DにH,V以外の爆弾が無い)。
   龍に8近傍で触れる爆弾は必ず龍の一部、という言い換え。D 以外の爆弾は D に触れない限り自由(別の塊が龍になることは、D の V/H と必ず触れるので起きない)。
   tdrag(P,q): 成分 q(マス番号の配列)がそれなら {H,V}(マス番号の配列)、違えば null。H を全列挙(Dは最大 R+C マスなので少ない)し、残りのマスを V が通れるかを行ごとのDPで見る。
   tok = ある/ないだけ, tpath = 例盤面用(cells=D, H, V)。なければ cut=龍が途切れる列/行のマス(NG例の赤枠用)。 */
function tcomp8(P,m){const N=m.length,seen=new Uint8Array(N),o=[];
 for(let i=0;i<N;i++)if(m[i]&&!seen[i]){const q=[i];seen[i]=1;for(let h=0;h<q.length;h++)for(const y of P.adj8[q[h]])if(m[y]&&!seen[y]){seen[y]=1;q.push(y)}o.push(q)}
 return o}
function tdrag(P,q){const R=P.R,C=P.C,n=q.length;
 if(n<Math.max(R,C)+1||n>R+C)return null;
 const inq=new Uint8Array(R*C),inH=new Uint8Array(R*C),need=new Int16Array(R),Hr=new Int16Array(C);
 for(const i of q)inq[i]=1;
 const vpath=avoid=>{const par=new Int16Array(R*C).fill(-2);let any=0;
  for(let c=0;c<C;c++)if(inq[c]&&c!=avoid&&(need[0]<0||need[0]==c)){par[c]=-1;any=1}
  if(!any)return null;
  for(let r=1;r<R;r++){any=0;
   for(let c=0;c<C;c++){const i=r*C+c;if(!inq[i]||i==avoid||(need[r]>=0&&need[r]!=c))continue;
    for(const k of[c,c-1,c+1])if(k>=0&&k<C&&par[(r-1)*C+k]!=-2){par[i]=k;any=1;break}}
   if(!any)return null}
  let c=0;while(par[(R-1)*C+c]==-2)c++;
  const V=new Array(R);for(let r=R-1;r>=0;r--){V[r]=r*C+c;c=par[r*C+c]}
  return V};
 let res=null;
 const rec=c=>{if(res)return;
  if(c==C){inH.fill(0);for(let x=0;x<C;x++)inH[Hr[x]*C+x]=1;
   need.fill(-1);let left=0;
   for(const i of q)if(!inH[i]){const r=i/C|0;if(need[r]>=0)return;need[r]=i%C;left++}
   if(!left)return; /* V が H の部分になる(2体でない) */
   for(let x=0;x<C;x++){const h=Hr[x]*C+x,V=vpath(h); /* h を通らない V = H⊄V */
    if(V){res={H:Array.from(Hr,(r,x)=>r*C+x),V};return}}
   return}
  for(let r=0;r<R;r++){if(!inq[r*C+c])continue;if(c>0&&Math.abs(r-Hr[c-1])>1)continue;Hr[c]=r;rec(c+1);if(res)return}};
 rec(0);return res}
function tok(P,m){for(const q of tcomp8(P,m))if(tdrag(P,q))return true;return false}
function tpath(P,m){const R=P.R,C=P.C;
 for(const q of tcomp8(P,m)){const t=tdrag(P,q);if(t)return{ok:true,cells:q,H:t.H,V:t.V,cut:[]}}
 const a=dpath(P,m);if(!a.ok)return{ok:false,cells:null,cut:a.cut};
 const mt=new Uint8Array(R*C);for(let r=0;r<R;r++)for(let c=0;c<C;c++)mt[c*R+r]=m[r*C+c]; /* 転置して上下の龍を見る */
 const b=dpath({R:C,C:R},mt);
 if(!b.ok)return{ok:false,cells:null,cut:b.cut.map(j=>(j%R)*C+(j/R|0))};
 return{ok:false,cells:null,cut:[]}}
