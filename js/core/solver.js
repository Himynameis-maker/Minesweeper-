/* [core/solver] 推論エンジン deduce と、それで盤面を解き進める sim。DOM非依存。
   全体制約系の拡張(grp/liar のような新フック)はここが主戦場。既存の拡張箇所は [grp] [liar] という印(行頭の小さなコメント)で探す。
   不変条件: deduce は sound(確定は必ず真)。必要条件だけで枝刈りし、十分条件を足さない。 */

/* 確定推論。st:0未知/1開示/2既知爆弾, num:開示マスの数字。返り値[{i,mine,tier,src}] tier1=単一制約, tier3=組合せ(CSP全列挙+残り爆弾数)。常にsound
   all=1 のときは同じマスの全根拠を返し、tier1があってもtier3まで調べる(ヒント用)。
   grp(連結成分サイズ固定)は「必要条件のみ」(楽観側)で使う: S[i]=0安全/1爆弾確定/2未確定。
   必要条件1: 確定爆弾の連結成分は grp 以下 / 必要条件2: その成分を含む「安全でないマス」の連結領域は grp 以上 */
function deduce(P,st,num,M,skip,all){
 const N=P.nb.length,out=[],K=[],unk=[];let km=0;
 for(let i=0;i<N;i++){if(st[i]==2)km++;if(st[i]==0)unk.push(i)}
 /*[wt]*/const add=(cells,lo,hi,src,d,w)=>{const u=[],uw=w?[]:null;let m=0,sw=0;
  for(let q=0;q<cells.length;q++){const c=cells[q],x=w?w[q]:1;if(st[c]==0){u.push(c);if(w)uw.push(x);sw+=x}else if(st[c]==2)m+=x}
  if(u.length)K.push({cells:u,w:uw,sw,lo:Math.max(0,lo-m),hi:Math.min(sw,hi-m),src,hv:(d||0)-m})};
 for(let i=0;i<N;i++)if(st[i]==1){
  /*[liar]*/if(P.lie){const L=P.nb[i].length,d=num[i],un=P.nb[i].some(c=>st[c]!=1);add(P.nb[i],Math.max(d-1,un?1:0),Math.min(L,d+1),{t:'n',i},d)}
  else add(P.nb[i],num[i],num[i],{t:'n',i},0,/*[wt]*/P.w?P.nb[i].map(c=>P.w[c]):null)}
 for(const k of P.cons)if(k.src.id!==skip)add(k.cells,k.lo,k.hi,k.src);
 const T=M-km,seen=new Set(),push=(i,mine,tier,src)=>{const key=all?i+src.t+(src.id??src.i??''):i;if(!seen.has(key)){seen.add(key);out.push({i,mine,tier,src})}};
 /*[grp]*/const GN=(P.grp&&P.gid!==skip)?P.grp:0;let S=null,vis=null,sp=0,hb=0;
 /*[grp]*/const reach=(x,onlyB,cap)=>{const q=[x];vis[x]=++sp;hb=S[x]==1?1:0;
  for(let h=0;h<q.length&&q.length<cap;h++)for(const y of P.adj[q[h]])if(vis[y]!=sp&&(onlyB?S[y]==1:S[y]!=0)){vis[y]=sp;q.push(y);if(S[y]==1)hb=1}
  return q.length};
 /*[grp]*/const gchk=(x,v)=>{
  if(v){if(reach(x,1,GN+1)>GN)return false;return reach(x,0,GN)>=GN}
  for(const y of P.adj[x])if(S[y]!=0&&reach(y,0,GN)<GN&&hb)return false;
  return true};
 /*[iso]*/const IM=!!P.iso&&P.iid!==skip,IX=IM?P.imax:0; /* 孤立禁止: 爆弾の8近傍に「安全でない」マスが1つ以上要る。imax があれば確定爆弾の8近傍連結成分は imax 個以下(どちらも必要条件のみ) */
 /*[iso]*/const ichk=(x,v)=>{const A=P.adj8;
  if(v){if(!A[x].some(y=>S[y]!=0))return false;
   if(IX){const q=[x];vis[x]=++sp;for(let h=0;h<q.length&&q.length<=IX;h++)for(const y of A[q[h]])if(vis[y]!=sp&&S[y]==1){vis[y]=sp;q.push(y)}
    return q.length<=IX}
   return true}
  for(const y of A[x])if(S[y]==1&&!A[y].some(z=>S[z]!=0))return false;
  return true};
 /*[conn]*/const CM=!!P.conn&&P.cnid!==skip; /* 手繋ぎ: 爆弾が全部8近傍でひと続き。必要条件: 確定爆弾が全て「安全でないマス」の同じ連結領域にあり、その領域は M マス以上 */
 /*[conn]*/const cq=new Int32Array(N),cv=new Int32Array(N);let cst=0,cz=0,cmn=0;
 /*[conn]*/const cfl=(x,ts)=>{cz=0;cmn=0;let h=0,t=0;cq[t++]=x;cv[x]=ts;while(h<t){const a=cq[h++];cz++;if(S[a]==1)cmn++;for(const y of P.adj8[a])if(cv[y]!=ts&&S[y]!=0){cv[y]=ts;cq[t++]=y}}};
 /*[conn]*/const cchk=()=>{let sd=-1,nm=0;for(let i=0;i<N;i++)if(S[i]==1){nm++;if(sd<0)sd=i}
  const ts=++cst;if(sd>=0){cfl(sd,ts);return cmn==nm&&cz>=M}
  for(let i=0;i<N;i++)if(S[i]!=0&&cv[i]!=ts){cfl(i,ts);if(cz>=M)return true}
  return false};
 /*[grp]*/if(GN||IM||CM){S=new Uint8Array(N);vis=new Int32Array(N);for(let i=0;i<N;i++)S[i]=st[i]==1?0:st[i]==2?1:2}
 /*[liar]*/const HM=P.lie&&P.lid!==skip;let rH,cH,rU,cU,rX,cX;
 /*[liar]*/if(HM){const R0=P.R,C0=P.C;rH=new Int8Array(R0);cH=new Int8Array(C0);rU=new Int8Array(R0);cU=new Int8Array(C0);rX=new Int8Array(R0);cX=new Int8Array(C0);
  for(let i=0;i<N;i++){const r=i/C0|0,c=i%C0;if(st[i]==0){rX[r]=1;cX[c]=1}
   else if(st[i]==1){if(P.nb[i].some(j=>st[j]==0)){rU[r]++;cU[c]++}else{let m=0;for(const j of P.nb[i])if(st[j]==2)m++;if(m==num[i]){rH[r]++;cH[c]++}}}}}
 /*[wt]*/for(const k of K)for(let q=0;q<k.cells.length;q++){const x=k.w?k.w[q]:1;if(x>k.hi)push(k.cells[q],0,1,k.src);else if(k.sw-x<k.lo)push(k.cells[q],1,1,k.src)}
 if(T<=0)unk.forEach(c=>push(c,0,1,{t:'c'}));else if(T>=unk.length)unk.forEach(c=>push(c,1,1,{t:'c'}));
 /*[grp]*/if(GN){const gs={t:'r',id:P.gid};
  for(const x of unk){S[x]=1;if(!gchk(x,1)){S[x]=2;push(x,0,1,gs);continue}
   S[x]=0;const ok0=gchk(x,0);S[x]=2;if(!ok0)push(x,1,1,gs)}}
 /*[iso]*/if(IM){const is={t:'r',id:P.iid};
  for(const x of unk){S[x]=1;if(!ichk(x,1)){S[x]=2;push(x,0,1,is);continue}
   S[x]=0;const ok0=ichk(x,0);S[x]=2;if(!ok0)push(x,1,1,is)}}
 /*[conn]*/if(CM){const cs2={t:'r',id:P.cnid};
  for(const x of unk){S[x]=1;if(!cchk()){S[x]=2;push(x,0,1,cs2);continue}
   S[x]=0;const ok0=cchk();S[x]=2;if(!ok0)push(x,1,1,cs2)}}
 if(out.length&&!all)return out;
 const par={},f=x=>par[x]===x?x:(par[x]=f(par[x]));
 for(const k of K)for(const c of k.cells)if(par[c]===undefined)par[c]=c;
 for(const k of K){const a=f(k.cells[0]);for(const c of k.cells)par[f(c)]=a}
 /*[liar]*/if(HM){const all=Object.keys(par);if(all.length){const r0=f(+all[0]);for(const c of all)par[f(+c)]=r0}}
 const groups={};for(const c in par)(groups[f(+c)]=groups[f(+c)]||[]).push(+c);
 const comps=[];
 for(const g of Object.values(groups)){
  const gs=new Set(g),n=g.length,pos={};g.forEach((c,j)=>pos[c]=j);
  const cc=K.filter(k=>gs.has(k.cells[0])).map(k=>({cells:k.cells.map(c=>pos[c]),w:k.w,lo:k.lo,hi:k.hi,a:0,u:k.sw,y:k.src.t=='n'?k.src.i:-1,hv:k.hv}));
  /*[wt]*/const byCell=g.map(()=>[]),byW=g.map(()=>[]);cc.forEach(k=>k.cells.forEach((j,q)=>{byCell[j].push(k);byW[j].push(k.w?k.w[q]:1)}));
  const ks=new Uint8Array(n+1),mk=g.map(()=>new Uint8Array(n+1)),sk=g.map(()=>new Uint8Array(n+1)),a=new Array(n);
  let nodes=0,over=false,cnt=0;
  const rec=j=>{if(over)return;if(++nodes>30000){over=true;return}
   if(j==n){ks[cnt]=1;for(let x=0;x<n;x++)(a[x]?mk:sk)[x][cnt]=1;return}
   for(const v of[0,1]){const bj=byCell[j],wj=byW[j];for(let q=0;q<bj.length;q++){bj[q].u-=wj[q];bj[q].a+=v*wj[q]}
    let bad=false;for(const k of bj)if(k.a>k.hi||k.a+k.u<k.lo)bad=true;
    /*[grp]*/if(!bad&&GN){S[g[j]]=v;if(!gchk(g[j],v))bad=true}
    /*[iso]*/if(!bad&&IM){S[g[j]]=v;if(!ichk(g[j],v))bad=true}
    /*[conn]*/if(!bad&&CM){S[g[j]]=v;if(!cchk())bad=true}
    const dec=[];
    /*[liar]*/if(!bad&&HM){const C0=P.C;for(const k of byCell[j])if(k.y>=0&&k.u==0){const r=k.y/C0|0,c=k.y%C0,h=k.a==k.hv;rU[r]--;cU[c]--;if(h){rH[r]++;cH[c]++}dec.push([r,c,h])}
     for(const[r,c]of dec)if(rH[r]>1||cH[c]>1||rH[r]+rU[r]+rX[r]<1||cH[c]+cU[c]+cX[c]<1)bad=true}
    if(!bad){a[j]=v;cnt+=v;rec(j+1);cnt-=v}
    for(const[r,c,h]of dec){rU[r]++;cU[c]++;if(h){rH[r]--;cH[c]--}}
    /*[grp]*/if(GN||IM||CM)S[g[j]]=2;
    for(let q=0;q<bj.length;q++){bj[q].u+=wj[q];bj[q].a-=v*wj[q]}}};
  rec(0);
  if(over||!ks.some(x=>x)){ks.fill(1);comps.push({cells:g,ks,mk:g.map(()=>ks),sk:g.map(()=>ks),n})}
  else comps.push({cells:g,ks,mk,sk,n})}
 const fr=unk.filter(c=>par[c]===undefined),fn=fr.length;
 if(fn){const ks=new Uint8Array(fn+1).fill(1),mk=new Uint8Array(fn+1),sk=new Uint8Array(fn+1);
  for(let k=0;k<=fn;k++){mk[k]=k>=1?1:0;sk[k]=k<=fn-1?1:0}
  comps.push({cells:fr,ks,mk:fr.map(()=>mk),sk:fr.map(()=>sk),n:fn,free:1})}
 const conv=(A,B)=>{const r=new Uint8Array(A.length+B.length-1);for(let i=0;i<A.length;i++)if(A[i])for(let j=0;j<B.length;j++)if(B[j])r[i+j]=1;return r};
 const why=x=>{const L=K.filter(k=>k.cells.includes(x));return{t:'x',ns:L.filter(k=>k.src.t=='n').map(k=>k.src.i),rs:[...new Set([...L.filter(k=>k.src.t=='r').map(k=>k.src.id),...(GN?[P.gid]:[]),...(IM?[P.iid]:[]),...(CM?[P.cnid]:[]),...(HM?[P.lid]:[])])]}};
 comps.forEach((cj,j)=>{let O=Uint8Array.of(1);comps.forEach((c,q)=>{if(q!=j)O=conv(O,c.ks)});
  cj.cells.forEach((x,p)=>{let m=0,s=0;
   for(let k=0;k<=cj.n;k++)if(T-k>=0&&T-k<O.length&&O[T-k]){if(cj.mk[p][k])m=1;if(cj.sk[p][k])s=1}
   if(m&&!s)push(x,1,3,cj.free?{t:'c'}:why(x));else if(s&&!m)push(x,0,3,cj.free?{t:'c'}:why(x))})});
 return out}

/* 開始マスから推論のみで解き進めるシミュレーション。真の配置と食い違えばbug。L=liarの表示状態({sh:表示数字}) */
function sim(P,M,mines,start,skip,L){
 const N=P.nb.length,st=new Uint8Array(N),act=P.nb.map((_,i)=>ncount(P,mines,i)),num=L?L.sh:act;
 const rev=i=>{const q=[i];while(q.length){const x=q.pop();if(st[x])continue;st[x]=1;if(!act[x])for(const y of P.nb[x])if(!st[y]&&!mines[y])q.push(y)}};
 rev(start);let open0=0;for(let i=0;i<N;i++)if(st[i]==1)open0++;
 const kinds=new Set(),safe=N-M;let rounds=0,bug=0;
 for(;;){const d=deduce(P,st,num,M,skip);if(!d.length)break;rounds++;
  for(const e of d){if(!!mines[e.i]!=!!e.mine)bug=1;if(st[e.i])continue;kinds.add(e.tier+e.src.t);if(e.mine)st[e.i]=2;else rev(e.i)}
  if(bug)break}
 let rv=0;for(let i=0;i<N;i++)if(st[i]==1)rv++;
 return{ok:rv==safe&&!bug,bug,rv,open0,rounds,kinds,safe,st}}
