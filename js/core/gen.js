/* [core/gen] ノーゲス+非単調な盤面生成(非同期・キャンセル可)。DOM非依存。
   密度ムラ配置→推論で詰まった未確定領域だけ山登りで修正。
   grp持ちは「連結成分サイズgrpのグループを、縦横で触れないように置く」配置と「グループごと動かす」山登り。
   liar持ちは「各行・各列に正直な数字1つ」の表示状態 L={hon,sg,sh} を一緒に作り、山登りでも動かす。
   ノーゲスでない盤面は絶対に返さない(見つからなければ null)。
   品質条件: 推論の種類>=2, 手順3段以上, 開始開放<=50%, cons/grp持ちルールは外すと詰む(=縛りが飾りでない)。
   qms秒探索して品質条件を満たさなければ「ノーゲスだが品質未達」を許容、hard秒で打ち切り。o.maxTries があれば、時間とは別に「初期盤面を何個まで試すか」でも打ち切る(デイリー・厳選用。GitHub の実行時間以外に時間制限を持たないため)。
   iso持ちは「8近傍でつながる塊(imax があれば2〜imax個。塊同士は8近傍で触れない)を置く」配置と「塊ごと動かす」山登り。
   下限つき cons(lo>0。例: tidy)は、爆弾を撒いてから違反を min-conflicts で直すサンプラ(lsample)と、valid を保つ swap の山登り(smove)を使う。
   鏡爆弾(P.mir)は「爆弾のうち上下左右に爆弾が無い3個を鏡爆弾(L.sp)にして、数字 L.sh に反映する」状態を盤面と一緒に作って動かす(mstate)。
   隠れ龍(P.dd。dragon.js の dbl:true)は「本物の龍1本=L.dr」を盤面と一緒に作り、数字=爆弾数+龍のマス数(L.sh)にする。山登りでは龍が壊れたら引き直す(rpath)。
   双竜(dragon:2)は「龍H(左→右)と龍V(上→下)を置き、その8近傍を避けて残りを撒く」配置(tsample)。
   dragon持ちは「左端から右端まで、1列ごとに直進か上下1行ずれで爆弾を並べる(DFS。直進の確率は盤面ごとにランダム)」配置(dsample)と、valid を保つ付け替えの山登り(smove)。
   新しい配置様式(例: ヘビ)のルールは、[grp] と同じ位置に「専用の sample と move」を足す(context.md 第6節)。 */
async function gen(cfg,o){o=o||{};const qms=o.qms??10000,hard=o.hard??120000,MC=o.maxCost??Infinity,mnC=o.minCost??0,mnD=o.minDeep??0,mnP=o.minDep??0,MT=o.maxTries??Infinity,cancel=o.cancel||(()=>0),tick=o.tick||(()=>0);
 const{R,C,M,ids}=cfg,N=R*C,P=prep(cfg),t0=performance.now(),kc=P.cons;
 /*[s1]*/const SZ=s=>P.s1?new Set([s]):new Set([s,...P.nb[s]]); /* 開始マスと「必ず安全にするマス」。ふつうは数字0にするため nb も安全。startOnly の縛り(均一な配置)では開始マス1つだけ(開始の数字は0でなくてよい) */
 if(P.grp&&M%P.grp)throw Error('爆弾数が'+P.grp+'の倍数ではありません');
 const byC=[...Array(N)].map(()=>[]);kc.forEach((k,q)=>k.cells.forEach(c=>byC[c].push(q)));
 /*[iso]*/const iok=m=>{if(P.imax)return ccomps(m).every(q=>q.length>=2&&q.length<=P.imax);for(let i=0;i<N;i++)if(m[i]&&!P.adj8[i].some(y=>m[y]))return false;return true};
 /*[conn]*/const ccomps=m=>{const seen=new Uint8Array(N),o=[];for(let i=0;i<N;i++)if(m[i]&&!seen[i]){const q=[i];seen[i]=1;for(let h=0;h<q.length;h++)for(const y of P.adj8[q[h]])if(m[y]&&!seen[y]){seen[y]=1;q.push(y)}o.push(q)}return o};
 /*[conn]*/const cconn=m=>ccomps(m).length<=1;
 const valid=m=>kc.every(k=>{let s=0;for(const c of k.cells)s+=m[c];return s>=k.lo&&s<=k.hi})&&(!P.grp||gcomps(P,m).every(q=>q.length==P.grp))&&(!P.iso||iok(m))&&(!P.conn||cconn(m))&&(!P.dragon||(P.dragon==2?tok(P,m):dok(P,m)));
 const nec=ids.filter(id=>RULES[id].grp||RULES[id].iso||RULES[id].conn||RULES[id].dragon||(RULES[id].cons&&RULES[id].cons(R,C).length));
 const LM=!!P.lie,LV=P.lie==2; /* hon[]=特別マス(lie1=正直, lie2=嘘)。LV なら hon 以外が正直 */if(LM&&R!=C)throw Error('縦と横が同じ盤面のみ');
 /* ---- [dd] 隠れ龍: 爆弾の中から龍の道(1列に1マス、隣の列とは行が同じか±1)を1本ランダムに選ぶ(rpath。右端から「そこから右へ行ける」を数えておくので必ず見つかる)。
        数字 sh[i] = 8近傍の爆弾数 + 8近傍に入る龍のマス数。L={sh,dr(龍のマス番号の配列)} ---- */
 const DDM=!!P.dd;
 const rpath=m=>{const g=[];for(let c=C-1;c>=0;c--){g[c]=new Uint8Array(R);for(let r=0;r<R;r++)if(m[r*C+c]&&(c==C-1||g[c+1][r]||(r>0&&g[c+1][r-1])||(r<R-1&&g[c+1][r+1])))g[c][r]=1}
  const s=[];for(let r=0;r<R;r++)if(g[0][r])s.push(r);if(!s.length)return null;
  let r=s[rnd()*s.length|0];const o=[r*C];
  for(let c=1;c<C;c++){const t=[r-1,r,r+1].filter(y=>y>=0&&y<R&&g[c][y]);r=t[rnd()*t.length|0];o.push(r*C+c)}
  return o};
 const ddstate=(m,dr)=>{if(!dr)return null;const isD=new Uint8Array(N),sh=new Int8Array(N);for(const c of dr)isD[c]=1;
  for(let i=0;i<N;i++)if(!m[i]){let a=0;for(const j of P.nb[i])a+=m[j]+isD[j];sh[i]=a}
  return{sh,dr}};
 const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=rnd()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
 /* ---- [mir] 鏡爆弾: 爆弾のうち P.mk 個(1個)(上下左右に爆弾が無いもの)が鏡爆弾 sp。マスpの鏡爆弾は ms[p](中心と点対称なマスの周囲8マス)の数字を+1する。
        開始マスの数字は0のままにしたいので、ms[開始マス] の中のマスは鏡爆弾にしない。keep があれば、それをなるべく残す。
        L={sp,sh}。sh=表示する数字(爆弾マスは0)。見つからなければ null ---- */
 const MIRM=!!P.mir;
 /* 開始マスは盤面の中央寄り(中心から縦横 min(R,C)/4 マス以内)。開いた範囲とその点対称側が重なるので、鏡爆弾の+1が見える数字が増え、解き始めやすい(隅だと点対称側が遠く、数字がほぼ使えない) */
 const mcs=()=>{const d=Math.max(1,Math.floor(Math.min(R,C)/4));let s;do{s=rnd()*N|0}while(Math.abs((s/C|0)-(R-1)/2)>d||Math.abs(s%C-(C-1)/2)>d);return s};
 const mstate=(m,cs,keep)=>{const bz=new Set(P.ms[cs]),ok=[];
  for(let j=0;j<N;j++)if(m[j]&&!bz.has(j)&&P.o4[j].every(y=>!m[y]))ok.push(j);
  const sp=keep?keep.filter(j=>m[j]&&ok.includes(j)):[];
  const rest=shuf(ok.filter(j=>!sp.includes(j)));while(sp.length<P.mk&&rest.length)sp.push(rest.pop());
  if(sp.length<P.mk)return null;
  const ex=new Int8Array(N),sh=new Int8Array(N);for(const p of sp)for(const y of P.ms[p])ex[y]++;
  for(let i=0;i<N;i++)if(!m[i])sh[i]=ncount(P,m,i)+ex[i];
  return{sp,sh}};
 /* ---- [liar] 正直な数字: 各行・各列に1つ(安全マスのみ)。ほかの安全マスは±1ズレる(範囲外なら逆向き) ---- */
 const pickHon=m=>{const hon=new Uint8Array(N),used=new Uint8Array(C);let nodes=0;
  const rec=r=>{if(r==R)return true;if(++nodes>3000)return false;const cs=shuf([...Array(C).keys()].filter(c=>!used[c]&&!m[r*C+c]));
   for(const c of cs){used[c]=1;hon[r*C+c]=1;if(rec(r+1))return true;used[c]=0;hon[r*C+c]=0}return false};
  return rec(0)?hon:null};
 const mkShown=(m,hon,sg)=>{const sh=new Int8Array(N);for(let i=0;i<N;i++)if(!m[i]){let a=0;for(const j of P.nb[i])a+=m[j];const ln=P.nb[i].length;
  if(!!hon[i]!==LV)sh[i]=a;else{let s=sg[i]?1:-1;if(a+s<0||a+s>ln)s=-s;sh[i]=a+s}}return sh};
 const lstate=(m,hon0,sg0)=>{const hon=hon0||pickHon(m);if(!hon)return null;const sg=sg0||Uint8Array.from({length:N},()=>rnd()<.5?1:0);return{hon,sg,sh:mkShown(m,hon,sg)}};
 const lmove=(cur,cl,U)=>{const mv=rnd();
  if(mv<.5){const r1=rnd()*R|0,r2=rnd()*R|0;if(r1==r2)return null;let c1=-1,c2=-1;for(let c=0;c<C;c++){if(cl.hon[r1*C+c])c1=c;if(cl.hon[r2*C+c])c2=c}
   if(cur[r1*C+c2]||cur[r2*C+c1])return null;const hon=cl.hon.slice();hon[r1*C+c1]=hon[r2*C+c2]=0;hon[r1*C+c2]=hon[r2*C+c1]=1;
   return{m:cur,L:{hon,sg:cl.sg,sh:mkShown(cur,hon,cl.sg)}}}
  const cs2=U.filter(i=>!cur[i]&&!!cl.hon[i]===LV);if(!cs2.length)return null;const sg=cl.sg.slice(),i=cs2[rnd()*cs2.length|0];sg[i]^=1;
  return{m:cur,L:{hon:cl.hon,sg,sh:mkShown(cur,cl.hon,sg)}}};
 /* ---- [grp] グループ配置(gsample)とグループ単位の山登り(gmove) ---- */
 const wpick=(a,w)=>{let t=rnd()*a.reduce((s,c)=>s+w[c],0),p=a[a.length-1];for(const c of a){t-=w[c];if(t<=0){p=c;break}}return p};
 const gsample=(sz,w)=>{const n=P.grp,m=new Uint8Array(N),cnt=kc.map(()=>0),blk=new Uint8Array(N);
  const can=c=>!sz.has(c)&&!m[c]&&!blk[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)};
  for(let g=0;g<M/n;g++){const a=[];for(let c=0;c<N;c++)if(can(c)&&(!P.conn||g==0||P.adj8[c].some(y=>m[y])))a.push(c);if(!a.length)return null;
   const gr=[wpick(a,w)];put(gr[0]);
   while(gr.length<n){const f=[];for(const c of gr)for(const y of P.adj[c])if(can(y)&&!f.includes(y))f.push(y);if(!f.length)return null;const y=wpick(f,w);gr.push(y);put(y)}
   for(const c of gr){blk[c]=1;for(const y of P.adj[c])blk[y]=1}}
  return valid(m)?m:null};
 const gmove=(cur,a,Us,cs)=>{const n=P.grp,sz=SZ(cs),m=cur.slice(),x=a[rnd()*a.length|0],cm=gcomps(P,cur).find(q=>q.includes(x));
  if(!cm)return null;for(const c of cm)m[c]=0;
  const cand=[];for(let c=0;c<N;c++)if(!m[c]&&Us.has(c)&&!sz.has(c)&&!P.adj[c].some(y=>m[y])&&(!P.conn||P.adj8[c].some(y=>m[y])))cand.push(c);
  if(!cand.length)return null;
  const g=[cand[rnd()*cand.length|0]];m[g[0]]=1;
  while(g.length<n){const f=[];for(const c of g)for(const y of P.adj[c])if(!m[y]&&!sz.has(y)&&!f.includes(y)&&!P.adj[y].some(z=>m[z]&&!g.includes(z)))f.push(y);
   if(!f.length)return null;const y=f[rnd()*f.length|0];g.push(y);m[y]=1}
  return m};
 /* ---- [iso] 孤立禁止: 8近傍でつながる塊を置いていく(isample)と、塊を壊さない山登り(imove)。
        iso:true は塊2〜4個(塊同士が触れてもよい)。iso:n(imax)は塊2〜n個で、塊同士は8近傍で触れない(触れると1つの塊になるため) ---- */
 const isample=(sz,w)=>{const mx=P.imax||4,m=new Uint8Array(N),cnt=kc.map(()=>0),blk=new Uint8Array(N);
  const can=c=>!sz.has(c)&&!m[c]&&!blk[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)};
  for(let left=M;left>0;){
   const ns=[];for(let k=2;k<=Math.min(mx,left);k++)if(left-k!=1)ns.push(k);if(!ns.length)return null;
   const n=ns[rnd()*ns.length|0];
   const a=[];for(let c=0;c<N;c++)if(can(c))a.push(c);if(!a.length)return null;
   const g=[wpick(a,w)];put(g[0]);
   while(g.length<n){const f=[];for(const c of g)for(const y of P.adj8[c])if(can(y)&&!f.includes(y))f.push(y);if(!f.length)return null;const y=wpick(f,w);g.push(y);put(y)}
   if(P.imax)for(const c of g){blk[c]=1;for(const y of P.adj8[c])blk[y]=1}
   left-=n}
  return valid(m)?m:null};
 const imove=(cur,a,Us,cs)=>{const sz=SZ(cs),m=cur.slice(),x=a[rnd()*a.length|0];
  if(P.imax&&rnd()<.5){ /* 塊ごと、同じ大きさのまま別の場所(他の塊に触れない所)へ */
   const cm=ccomps(cur).find(q=>q.includes(x));if(!cm)return null;for(const c of cm)m[c]=0;
   const ban=new Uint8Array(N);for(let i=0;i<N;i++)if(m[i]){ban[i]=1;for(const y of P.adj8[i])ban[y]=1}
   const fr=c=>!ban[c]&&!m[c]&&Us.has(c)&&!sz.has(c);
   const cand=[];for(const c of Us)if(fr(c))cand.push(c);if(!cand.length)return null;
   const g=[cand[rnd()*cand.length|0]];m[g[0]]=1;
   while(g.length<cm.length){const f=[];for(const c of g)for(const y of P.adj8[c])if(fr(y)&&!f.includes(y))f.push(y);if(!f.length)return null;const y=f[rnd()*f.length|0];g.push(y);m[y]=1}
   return m}
  const rm=[x];m[x]=0;
  if(rnd()<.5){const zs=P.adj8[x].filter(y=>m[y]&&Us.has(y));if(zs.length){const z=zs[rnd()*zs.length|0];m[z]=0;rm.push(z)}}
  const fr=c=>!m[c]&&Us.has(c)&&!sz.has(c)&&!rm.includes(c);
  if(rm.length==1){const cand=[];for(const c of Us)if(fr(c)&&P.adj8[c].some(y=>m[y]))cand.push(c);
   if(!cand.length)return null;m[cand[rnd()*cand.length|0]]=1;return m}
  const c1s=[];for(const c of Us)if(fr(c))c1s.push(c);if(!c1s.length)return null;
  const c1=c1s[rnd()*c1s.length|0],c2s=P.adj8[c1].filter(fr);if(!c2s.length)return null;
  m[c1]=1;m[c2s[rnd()*c2s.length|0]]=1;return m};
 /* ---- [conn] 手繋ぎ: 8近傍でつながる塊を1マスずつ育てる(csample。鎖っぽくなるよう隣の爆弾が少ないマスを優先)と、切れない爆弾を付け替える山登り(cmove) ---- */
 const csample=(sz,w)=>{const m=new Uint8Array(N),cnt=kc.map(()=>0),ww=new Float64Array(N);
  const can=c=>!sz.has(c)&&!m[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)};
  const a=[];for(let c=0;c<N;c++)if(can(c))a.push(c);if(!a.length)return null;put(wpick(a,w));
  for(let n=1;n<M;n++){const f=[];for(let c=0;c<N;c++)if(can(c)){let k=0;for(const y of P.adj8[c])k+=m[y];if(k){f.push(c);ww[c]=w[c]/(1+2*(k-1))}}
   if(!f.length)return null;put(wpick(f,ww))}
  return valid(m)?m:null};
 const cmove=(cur,a,Us,cs)=>{const sz=SZ(cs);
  for(let t=0;t<6;t++){const m=cur.slice(),x=a[rnd()*a.length|0];m[x]=0;if(!cconn(m))continue;
   const cand=[];for(const c of Us)if(!m[c]&&c!=x&&!sz.has(c)&&P.adj8[c].some(y=>m[y]))cand.push(c);
   if(!cand.length)continue;m[cand[rnd()*cand.length|0]]=1;return m}
  return null};
 /* ---- [lo] 下限つき cons(tidy など): 爆弾M個を密度ムラで撒いてから、違反中の制約を min-conflicts で直す(lsample)と、
        「爆弾1個を別の安全マスへ」を valid を保つものが見つかるまで試す山登り(smove)。
        標準サンプラは上限しか見ず、move も valid を満たさないと棄却されるため、下限が厳しい cons はこちらに切り替わる。
        grp/iso/conn と併用のときは各専用サンプラが優先(下限は見ない) ---- */
 const LO=kc.some(k=>k.lo>0);
 const lsample=(sz,w)=>{const m=new Uint8Array(N),K=kc.length,cnt=new Int16Array(K),fr=[];
  for(let i=0;i<N;i++)if(!sz.has(i))fr.push(i);if(fr.length<M)return null;
  const key=new Float64Array(N);for(const c of fr)key[c]=Math.log(rnd()+1e-12)/w[c];
  fr.slice().sort((p,q)=>key[q]-key[p]).slice(0,M).forEach(c=>m[c]=1);
  for(let q=0;q<K;q++){let s=0;for(const c of kc[q].cells)s+=m[c];cnt[q]=s}
  const v=q=>{const s=cnt[q],k=kc[q];return s<k.lo?k.lo-s:s>k.hi?s-k.hi:0};
  const flip=(c,d)=>{m[c]=d>0?1:0;for(const q of byC[c])cnt[q]+=d};
  const sum=qs=>{let t=0;for(const q of qs)t+=v(q);return t};
  for(let step=0;step<60*N;step++){
   const bad=[];for(let q=0;q<K;q++)if(v(q))bad.push(q);
   if(!bad.length)return valid(m)?m:null;
   const q=bad[rnd()*bad.length|0],need=cnt[q]<kc[q].lo,A=kc[q].cells.filter(c=>need?(!m[c]&&!sz.has(c)):m[c]);
   if(!A.length)return null;
   const want=need?1:0;let best=null,bd=1e9;
   for(const a of A)for(let t=0;t<6;t++){const b=fr[rnd()*fr.length|0];if(m[b]!=want)continue;
    const qs=new Set([...byC[a],...byC[b]]),b0=sum(qs);
    flip(a,need?1:-1);flip(b,need?-1:1);const d=sum(qs)-b0;flip(a,need?-1:1);flip(b,need?1:-1);
    const dd=d+rnd()*.5;if(dd<bd){bd=dd;best=[a,b]}}
   if(!best||rnd()<.08){const a=A[rnd()*A.length|0],ps=fr.filter(c=>m[c]==want);if(!ps.length)return null;best=[a,ps[rnd()*ps.length|0]]}
   flip(best[0],need?1:-1);flip(best[1],need?-1:1)}
  return null};
 const smove=(cur,a,b)=>{for(let t=0;t<80;t++){const m=cur.slice(),n=t<50?1:2;let ok=true;
   for(let k=0;k<n&&ok;k++){const xs=a.filter(c=>m[c]),x=xs[rnd()*xs.length|0];if(x==null){ok=false;break}
    let ys=b.filter(c=>!m[c]);if(t%2&&ys.length){const r=x/C|0,c=x%C,nr=ys.filter(y=>Math.abs((y/C|0)-r)<=2&&Math.abs(y%C-c)<=2);if(nr.length)ys=nr}
    const y=ys[rnd()*ys.length|0];if(y==null){ok=false;break}m[x]=0;m[y]=1}
   if(ok&&valid(m))return m}
  return null};
 /* ---- [dragon] 龍: 左端のランダムな行から右端まで、1列ごとに「直進 or 上下1行ずれ」で爆弾を並べ(DFS。直進の確率 p は盤面ごとにランダム 0.1〜0.9。ずれるときの上下は等確率)、残りの爆弾は密度ムラで撒く(dsample)。
        山登りは smove(valid を保つ付け替え。龍が切れる手は棄却)。conn と併用のときは、残りの爆弾を既存の爆弾の8近傍にだけ置く ---- */
 const dsample=(sz,w)=>{const m=new Uint8Array(N),cnt=kc.map(()=>0);
  const can=c=>!sz.has(c)&&!m[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)},del=c=>{m[c]=0;byC[c].forEach(q=>cnt[q]--)};
  let nodes=0;const p=.1+.8*rnd(); /* 直進確率。盤面ごとに決める(直進だらけの龍もあれば、ずっとうねる龍もある) */
  const dfs=(c,r)=>{if(c==C)return true;if(++nodes>600)return false;
   const rs=c==0?shuf([...Array(R).keys()]):(rnd()<p?[r,...shuf([r-1,r+1])]:[...shuf([r-1,r+1]),r]);
   for(const y of rs){if(y<0||y>=R)continue;const i=y*C+c;if(!can(i))continue;put(i);if(dfs(c+1,y))return true;del(i)}
   return false};
  if(M<C||!dfs(0,-1))return null;
  for(let n=C;n<M;n++){const a=[];for(let c=0;c<N;c++)if(can(c)&&(!P.conn||P.adj8[c].some(y=>m[y])))a.push(c);if(!a.length)return null;put(wpick(a,w))}
  return valid(m)?m:null};
 /* ---- [dragon:2] 双竜: 龍H(左→右)をDFSで置き、続けて龍V(上→下)をDFSで置く(Hと同じマスを通ってよい。通りたがる確率を盤面ごとにランダムにして、からまり方を変える)。
        残りの爆弾は、H∪V の8近傍(と H∪V 自身)を避けて密度ムラで撒く(龍に触れる爆弾は龍だけ)。山登りは smove(valid を保つ付け替え。龍の周りに爆弾を置く手や龍が切れる手は棄却) ---- */
 const tsample=(sz,w)=>{const m=new Uint8Array(N),cnt=kc.map(()=>0);
  const can=c=>!sz.has(c)&&!m[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)},del=c=>{m[c]=0;byC[c].forEach(q=>cnt[q]--)};
  let nodes=0;const p=.1+.8*rnd(),pv=.1+.8*rnd(),sh=rnd()*.7; /* sh=Vが既にあるマス(Hの上)を優先する確率 */
  const dfs=(c,r)=>{if(c==C)return true;if(++nodes>600)return false;
   const rs=c==0?shuf([...Array(R).keys()]):(rnd()<p?[r,...shuf([r-1,r+1])]:[...shuf([r-1,r+1]),r]);
   for(const y of rs){if(y<0||y>=R)continue;const i=y*C+c;if(!can(i))continue;put(i);if(dfs(c+1,y))return true;del(i)}
   return false};
  const dfv=(r,c)=>{if(r==R)return true;if(++nodes>1200)return false;
   let cs=r==0?shuf([...Array(C).keys()]):(rnd()<pv?[c,...shuf([c-1,c+1])]:[...shuf([c-1,c+1]),c]);
   if(rnd()<sh)cs=[...cs.filter(x=>x>=0&&x<C&&m[r*C+x]),...cs.filter(x=>x>=0&&x<C&&!m[r*C+x])];
   for(const x of cs){if(x<0||x>=C)continue;const i=r*C+x,had=m[i];if(!had&&!can(i))continue;if(!had)put(i);if(dfv(r+1,x))return true;if(!had)del(i)}
   return false};
  if(M<Math.max(R,C)+1||!dfs(0,-1)||(nodes=0,!dfv(0,-1)))return null;
  let nD=0;const blk=new Uint8Array(N);
  for(let i=0;i<N;i++)if(m[i]){nD++;blk[i]=1;for(const y of P.adj8[i])blk[y]=1}
  if(nD>M||nD>R+C)return null;
  for(let n=nD;n<M;n++){const a=[];for(let c=0;c<N;c++)if(can(c)&&!blk[c])a.push(c);if(!a.length)return null;put(wpick(a,w))}
  return valid(m)?m:null};
 /* ---- 標準の配置サンプラ(密度ムラ)。grp持ちは gsample、iso持ちは isample、dragon持ちは dsample、conn持ちは csample に切り替わる ---- */
 const sample=s=>{const sz=SZ(s),cx=[0,1,2].map(()=>[rnd()*R,rnd()*C,rnd()]),sg=Math.max(R,C)/3,w=[];
  for(let i=0;i<N;i++){let v=.25;for(const[y,x,a]of cx)v+=a*2*Math.exp(-(((i/C|0)-y)**2+(i%C-x)**2)/(2*sg*sg));w.push(v)}
  if(P.grp)return gsample(sz,w);
  if(P.iso)return isample(sz,w);
  if(P.dragon)return P.dragon==2?tsample(sz,w):dsample(sz,w);
  if(P.conn)return csample(sz,w);
  if(LO)return lsample(sz,w);
  const m=new Uint8Array(N),cnt=kc.map(()=>0),cand=[];for(let i=0;i<N;i++)if(!sz.has(i))cand.push(i);
  for(let n=0;n<M;n++){const ok=cand.filter(c=>!m[c]&&byC[c].every(q=>cnt[q]<kc[q].hi));if(!ok.length)return null;
   let t=rnd()*ok.reduce((a,c)=>a+w[c],0),pick=ok[ok.length-1];for(const c of ok){t-=w[c];if(t<=0){pick=c;break}}
   m[pick]=1;byC[pick].forEach(q=>cnt[q]++)}
  return valid(m)?m:null};
 /* ---- 例盤面用(UIの長押し): 解けるかは見ず、OK例とNG例だけ作る ---- */
 if(o.sampleOnly){let ex=null,bad=null,bc=[];
  let s0=0;for(let k=0;k<20000&&!ex;k++){s0=rnd()*N|0;ex=sample(s0);if(ex&&MIRM&&!mstate(ex,s0))ex=null}
  const sz0=SZ(s0); /* ex の開始マスと数字0の領域(NG例で爆弾を置かない)。下限つき cons は当たりが薄い(lines で約0.05%)ので多めに試す */
  const valid2=m=>kc.every(k=>{let s=0;for(const c of k.cells)s+=m[c];return s>=k.lo&&s<=k.hi}); /* NG例が cons の違反でなく龍の違反だけになるように */
  if(P.dragon==2&&ex){ /* 双竜のNG例: OK例の龍以外の爆弾を1つ、龍に8近傍で触れるマスへ動かす(赤枠=動かした爆弾)。龍以外の爆弾が無ければ下のランダム抽選 */
   const t=tpath(P,ex),D=new Set(t.cells||[]),ex2=[...Array(N).keys()].filter(i=>ex[i]&&!D.has(i));
   const nx=[...D].flatMap(i=>P.adj8[i]).filter(i=>!ex[i]&&!sz0.has(i));
   if(ex2.length&&nx.length){const m=ex.slice();m[ex2[rnd()*ex2.length|0]]=0;const y=nx[rnd()*nx.length|0];m[y]=1;if(!tok(P,m)&&valid2(m)){bad=m;bc=[y]}}}
  for(let k=0;k<3000&&!bad&&(kc.length||P.grp||P.iso||P.conn||P.dragon);k++){const m=new Uint8Array(N);for(let n=0;n<M;){const c=rnd()*N|0;if(!m[c]){m[c]=1;n++}}
   const vi=kc.filter(q=>{let s=0;for(const c of q.cells)s+=m[c];return s<q.lo||s>q.hi});
   const gb=P.grp?gcomps(P,m).filter(q=>q.length!=P.grp).flat():[];
   const ib=P.iso?ccomps(m).filter(q=>q.length<2||(P.imax&&q.length>P.imax)).flat():[];
   const cb=P.conn?(cc=>cc.length>1?cc.sort((p,q)=>q.length-p.length).slice(1).flat():[])(ccomps(m)):[];
   const db=P.dragon?(P.dragon==2?tpath(P,m).cut:dpath(P,m).cut):[];
   if(vi.length||gb.length||ib.length||cb.length||db.length){bad=m;bc=[...new Set([...vi.flatMap(q=>q.cells),...gb,...ib,...cb,...db])]}}
  let L=null;if(LM&&ex)for(let k=0;k<50&&!L;k++)L=lstate(ex);
  if(DDM&&ex)L=ddstate(ex,rpath(ex));
  if(MIRM&&ex)L=mstate(ex,s0);
  return{P,mines:ex,bad,bc,L}}
 /* ---- 品質判定と本体ループ ---- */
 const qual=(m,s,r,L)=>r.kinds.size>=2&&r.rounds>=3&&r.open0<=.5*r.safe&&r.maxc<=MC&&r.maxc>=mnC&&r.deep>=mnD&&nec.every(id=>{const x=sim(P,M,m,s,id,L);return!x.ok&&r.safe-x.rv>=mnP*r.safe}); /* 下限(厳選盤面用): maxc>=minCost=一番重い手が○通り以上 / deep>=minDeep=詰まる場面が○回以上 / 縛りを外すと解けなくなるマスが安全マスの minDep 以上 */
 let cur=null,cl=null,cs=0,cr=null,soft=null,inv=0,it=0,tries=0,att=0,last=t0;
 for(;;){const now=performance.now(),el=now-t0;
  if(el>hard||cancel())break;
  if(soft&&el>qms)break;
  if(now-last>40){last=now;tick(el,tries);await new Promise(r=>setTimeout(r,0))}
  if(!cur){if(tries>=MT||++att>MT*10)break; /* maxTries: 時間ではなく回数の打ち切り(tries=解けるか調べた初期盤面の数, att=配置を試した回数。配置が作れない縛りで空回りしないよう10倍まで)。未指定=無制限 */
   cs=MIRM?mcs():rnd()*N|0;cur=sample(cs);inv=it=0;if(!cur)continue;cl=null;if(LM){cl=lstate(cur);if(!cl){cur=null;continue}}else if(DDM){cl=ddstate(cur,rpath(cur));if(!cl){cur=null;continue}}else if(MIRM){cl=mstate(cur,cs);if(!cl){cur=null;continue}}tries++;cr=sim(P,M,cur,cs,undefined,cl);if(cr.bug)throw Error('solver unsound')}
  if(cr.ok){if(qual(cur,cs,cr,cl))return{mines:cur,start:cs,gf:1,q:1,L:cl,tries};soft={mines:cur,start:cs,gf:1,q:0,L:cl};cur=null;continue}
  if(++it>400){cur=null;continue}
  const U=[];for(let i=0;i<N;i++)if(!cr.st[i])U.push(i);
  const a=U.filter(i=>cur[i]),b=U.filter(i=>!cur[i]);
  if(!a.length||!b.length){cur=null;continue}
  let m2=null,l2=cl;const lm=LM&&rnd()<.6?lmove(cur,cl,U):null;
  if(lm){m2=lm.m;l2=lm.L}
  else{if(P.grp)m2=gmove(cur,a,new Set(U),cs);else if(P.iso)m2=imove(cur,a,new Set(U),cs);else if(P.dragon)m2=smove(cur,a,b);else if(P.conn)m2=cmove(cur,a,new Set(U),cs);else if(LO)m2=smove(cur,a,b);else{m2=cur.slice();m2[a[rnd()*a.length|0]]=0;m2[b[rnd()*b.length|0]]=1}
   if(m2&&LM){if(m2.some((x,i)=>x&&cl.hon[i]))m2=null;else l2=lstate(m2,cl.hon,cl.sg)}}
  if(DDM){ /* 隠れ龍: 爆弾を動かしたら龍を決め直す(前の龍が残っていれば多くはそのまま)。爆弾を動かさず龍だけ選び直す手もある */
   if(!m2&&rnd()<.5)m2=cur;
   if(m2){const keep=m2!==cur&&cl.dr.every(c=>m2[c])&&rnd()<.8;l2=ddstate(m2,keep?cl.dr:rpath(m2));if(!l2)m2=null}}
  /*[mir]*/if(MIRM){if(!m2||rnd()<.25)m2=cur; /* 爆弾を動かさず、鏡爆弾の選び直しだけの手もある */
   const kp=m2===cur?cl.sp.filter(()=>rnd()<.5):(rnd()<.8?cl.sp:null);l2=mstate(m2,cs,kp);if(!l2)m2=null}
  if(!m2||!valid(m2)){if(++inv>40)cur=null;continue}
  const r2=sim(P,M,m2,cs,undefined,l2);if(r2.bug)throw Error('solver unsound');
  if(r2.rv>=cr.rv){cur=m2;cl=l2;cr=r2}}
 return cancel()?null:soft}
