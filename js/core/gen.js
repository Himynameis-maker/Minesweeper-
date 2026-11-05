/* [core/gen] ノーゲス+非単調な盤面生成(非同期・キャンセル可)。DOM非依存。
   密度ムラ配置→推論で詰まった未確定領域だけ山登りで修正。
   grp持ちは「連結成分サイズgrpのグループを、縦横で触れないように置く」配置と「グループごと動かす」山登り。
   liar持ちは「各行・各列に正直な数字1つ」の表示状態 L={hon,sg,sh} を一緒に作り、山登りでも動かす。
   ノーゲスでない盤面は絶対に返さない(見つからなければ null)。
   品質条件: 推論の種類>=2, 手順3段以上, 開始開放<=50%, cons/grp持ちルールは外すと詰む(=縛りが飾りでない)。
   qms秒探索して品質条件を満たさなければ「ノーゲスだが品質未達」を許容、hard秒で打ち切り。
   新しい配置様式(例: ヘビ)のルールは、[grp] と同じ位置に「専用の sample と move」を足す(context.md 第6節)。 */
async function gen(cfg,o){o=o||{};const qms=o.qms??10000,hard=o.hard??120000,cancel=o.cancel||(()=>0),tick=o.tick||(()=>0);
 const{R,C,M,ids}=cfg,N=R*C,P=prep(cfg),t0=performance.now(),kc=P.cons;
 if(P.grp&&M%P.grp)throw Error('爆弾数が'+P.grp+'の倍数ではありません');
 const byC=[...Array(N)].map(()=>[]);kc.forEach((k,q)=>k.cells.forEach(c=>byC[c].push(q)));
 /*[iso]*/const iok=m=>{for(let i=0;i<N;i++)if(m[i]&&!P.adj8[i].some(y=>m[y]))return false;return true};
 const valid=m=>kc.every(k=>{let s=0;for(const c of k.cells)s+=m[c];return s>=k.lo&&s<=k.hi})&&(!P.grp||gcomps(P,m).every(q=>q.length==P.grp))&&(!P.iso||iok(m));
 const nec=ids.filter(id=>RULES[id].grp||RULES[id].iso||(RULES[id].cons&&RULES[id].cons(R,C).length));
 const LM=!!P.lie;if(LM&&R!=C)throw Error('縦と横が同じ盤面のみ');
 const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=rnd()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
 /* ---- [liar] 正直な数字: 各行・各列に1つ(安全マスのみ)。ほかの安全マスは±1ズレる(範囲外なら逆向き) ---- */
 const pickHon=m=>{const hon=new Uint8Array(N),used=new Uint8Array(C);let nodes=0;
  const rec=r=>{if(r==R)return true;if(++nodes>3000)return false;const cs=shuf([...Array(C).keys()].filter(c=>!used[c]&&!m[r*C+c]));
   for(const c of cs){used[c]=1;hon[r*C+c]=1;if(rec(r+1))return true;used[c]=0;hon[r*C+c]=0}return false};
  return rec(0)?hon:null};
 const mkShown=(m,hon,sg)=>{const sh=new Int8Array(N);for(let i=0;i<N;i++)if(!m[i]){let a=0;for(const j of P.nb[i])a+=m[j];const ln=P.nb[i].length;
  if(hon[i])sh[i]=a;else{let s=sg[i]?1:-1;if(a+s<0||a+s>ln)s=-s;sh[i]=a+s}}return sh};
 const lstate=(m,hon0,sg0)=>{const hon=hon0||pickHon(m);if(!hon)return null;const sg=sg0||Uint8Array.from({length:N},()=>rnd()<.5?1:0);return{hon,sg,sh:mkShown(m,hon,sg)}};
 const lmove=(cur,cl,U)=>{const mv=rnd();
  if(mv<.5){const r1=rnd()*R|0,r2=rnd()*R|0;if(r1==r2)return null;let c1=-1,c2=-1;for(let c=0;c<C;c++){if(cl.hon[r1*C+c])c1=c;if(cl.hon[r2*C+c])c2=c}
   if(cur[r1*C+c2]||cur[r2*C+c1])return null;const hon=cl.hon.slice();hon[r1*C+c1]=hon[r2*C+c2]=0;hon[r1*C+c2]=hon[r2*C+c1]=1;
   return{m:cur,L:{hon,sg:cl.sg,sh:mkShown(cur,hon,cl.sg)}}}
  const cs2=U.filter(i=>!cur[i]&&!cl.hon[i]);if(!cs2.length)return null;const sg=cl.sg.slice(),i=cs2[rnd()*cs2.length|0];sg[i]^=1;
  return{m:cur,L:{hon:cl.hon,sg,sh:mkShown(cur,cl.hon,sg)}}};
 /* ---- [grp] グループ配置(gsample)とグループ単位の山登り(gmove) ---- */
 const wpick=(a,w)=>{let t=rnd()*a.reduce((s,c)=>s+w[c],0),p=a[a.length-1];for(const c of a){t-=w[c];if(t<=0){p=c;break}}return p};
 const gsample=(sz,w)=>{const n=P.grp,m=new Uint8Array(N),cnt=kc.map(()=>0),blk=new Uint8Array(N);
  const can=c=>!sz.has(c)&&!m[c]&&!blk[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)};
  for(let g=0;g<M/n;g++){const a=[];for(let c=0;c<N;c++)if(can(c))a.push(c);if(!a.length)return null;
   const gr=[wpick(a,w)];put(gr[0]);
   while(gr.length<n){const f=[];for(const c of gr)for(const y of P.adj[c])if(can(y)&&!f.includes(y))f.push(y);if(!f.length)return null;const y=wpick(f,w);gr.push(y);put(y)}
   for(const c of gr){blk[c]=1;for(const y of P.adj[c])blk[y]=1}}
  return valid(m)?m:null};
 const gmove=(cur,a,Us,cs)=>{const n=P.grp,sz=new Set([cs,...P.nb[cs]]),m=cur.slice(),x=a[rnd()*a.length|0],cm=gcomps(P,cur).find(q=>q.includes(x));
  if(!cm)return null;for(const c of cm)m[c]=0;
  const cand=[];for(let c=0;c<N;c++)if(!m[c]&&Us.has(c)&&!sz.has(c)&&!P.adj[c].some(y=>m[y]))cand.push(c);
  if(!cand.length)return null;
  const g=[cand[rnd()*cand.length|0]];m[g[0]]=1;
  while(g.length<n){const f=[];for(const c of g)for(const y of P.adj[c])if(!m[y]&&!sz.has(y)&&!f.includes(y)&&!P.adj[y].some(z=>m[z]&&!g.includes(z)))f.push(y);
   if(!f.length)return null;const y=f[rnd()*f.length|0];g.push(y);m[y]=1}
  return m};
 /* ---- [iso] 孤立禁止: 8近傍でつながる2〜4個の塊を置いていく(isample)と、塊を壊さない山登り(imove) ---- */
 const isample=(sz,w)=>{const m=new Uint8Array(N),cnt=kc.map(()=>0);
  const can=c=>!sz.has(c)&&!m[c]&&byC[c].every(q=>cnt[q]<kc[q].hi);
  const put=c=>{m[c]=1;byC[c].forEach(q=>cnt[q]++)};
  for(let left=M;left>0;){
   let n=left<=4?left:2+(rnd()*3|0);if(left>4&&left-n==1)n=n>2?n-1:n+1;
   const a=[];for(let c=0;c<N;c++)if(can(c))a.push(c);if(!a.length)return null;
   const g=[wpick(a,w)];put(g[0]);
   while(g.length<n){const f=[];for(const c of g)for(const y of P.adj8[c])if(can(y)&&!f.includes(y))f.push(y);if(!f.length)return null;const y=wpick(f,w);g.push(y);put(y)}
   left-=n}
  return valid(m)?m:null};
 const imove=(cur,a,Us,cs)=>{const sz=new Set([cs,...P.nb[cs]]),m=cur.slice(),x=a[rnd()*a.length|0],rm=[x];m[x]=0;
  if(rnd()<.5){const zs=P.adj8[x].filter(y=>m[y]&&Us.has(y));if(zs.length){const z=zs[rnd()*zs.length|0];m[z]=0;rm.push(z)}}
  const fr=c=>!m[c]&&Us.has(c)&&!sz.has(c)&&!rm.includes(c);
  if(rm.length==1){const cand=[];for(const c of Us)if(fr(c)&&P.adj8[c].some(y=>m[y]))cand.push(c);
   if(!cand.length)return null;m[cand[rnd()*cand.length|0]]=1;return m}
  const c1s=[];for(const c of Us)if(fr(c))c1s.push(c);if(!c1s.length)return null;
  const c1=c1s[rnd()*c1s.length|0],c2s=P.adj8[c1].filter(fr);if(!c2s.length)return null;
  m[c1]=1;m[c2s[rnd()*c2s.length|0]]=1;return m};
 /* ---- 標準の配置サンプラ(密度ムラ)。grp持ちは gsample、iso持ちは isample に切り替わる ---- */
 const sample=s=>{const sz=new Set([s,...P.nb[s]]),cx=[0,1,2].map(()=>[rnd()*R,rnd()*C,rnd()]),sg=Math.max(R,C)/3,w=[];
  for(let i=0;i<N;i++){let v=.25;for(const[y,x,a]of cx)v+=a*2*Math.exp(-(((i/C|0)-y)**2+(i%C-x)**2)/(2*sg*sg));w.push(v)}
  if(P.grp)return gsample(sz,w);
  if(P.iso)return isample(sz,w);
  const m=new Uint8Array(N),cnt=kc.map(()=>0),cand=[];for(let i=0;i<N;i++)if(!sz.has(i))cand.push(i);
  for(let n=0;n<M;n++){const ok=cand.filter(c=>!m[c]&&byC[c].every(q=>cnt[q]<kc[q].hi));if(!ok.length)return null;
   let t=rnd()*ok.reduce((a,c)=>a+w[c],0),pick=ok[ok.length-1];for(const c of ok){t-=w[c];if(t<=0){pick=c;break}}
   m[pick]=1;byC[pick].forEach(q=>cnt[q]++)}
  return valid(m)?m:null};
 /* ---- 例盤面用(UIの長押し): 解けるかは見ず、OK例とNG例だけ作る ---- */
 if(o.sampleOnly){let ex=null,bad=null,bc=[];
  for(let k=0;k<20000&&!ex;k++)ex=sample(rnd()*N|0); /* 下限つき cons は当たりが薄い(lines で約0.05%)ので多めに試す */
  for(let k=0;k<3000&&!bad&&(kc.length||P.grp||P.iso);k++){const m=new Uint8Array(N);for(let n=0;n<M;){const c=rnd()*N|0;if(!m[c]){m[c]=1;n++}}
   const vi=kc.filter(q=>{let s=0;for(const c of q.cells)s+=m[c];return s<q.lo||s>q.hi});
   const gb=P.grp?gcomps(P,m).filter(q=>q.length!=P.grp).flat():[];
   const ib=P.iso?[...Array(N).keys()].filter(i=>m[i]&&!P.adj8[i].some(y=>m[y])):[];
   if(vi.length||gb.length||ib.length){bad=m;bc=[...new Set([...vi.flatMap(q=>q.cells),...gb,...ib])]}}
  let L=null;if(LM&&ex)for(let k=0;k<50&&!L;k++)L=lstate(ex);
  return{P,mines:ex,bad,bc,L}}
 /* ---- 品質判定と本体ループ ---- */
 const qual=(m,s,r,L)=>r.kinds.size>=2&&r.rounds>=3&&r.open0<=.5*r.safe&&nec.every(id=>!sim(P,M,m,s,id,L).ok);
 let cur=null,cl=null,cs=0,cr=null,soft=null,inv=0,it=0,tries=0,last=t0;
 for(;;){const now=performance.now(),el=now-t0;
  if(el>hard||cancel())break;
  if(soft&&el>qms)break;
  if(now-last>40){last=now;tick(el,tries);await new Promise(r=>setTimeout(r,0))}
  if(!cur){cs=rnd()*N|0;cur=sample(cs);inv=it=0;if(!cur)continue;cl=null;if(LM){cl=lstate(cur);if(!cl){cur=null;continue}}tries++;cr=sim(P,M,cur,cs,undefined,cl);if(cr.bug)throw Error('solver unsound')}
  if(cr.ok){if(qual(cur,cs,cr,cl))return{mines:cur,start:cs,gf:1,q:1,L:cl};soft={mines:cur,start:cs,gf:1,q:0,L:cl};cur=null;continue}
  if(++it>400){cur=null;continue}
  const U=[];for(let i=0;i<N;i++)if(!cr.st[i])U.push(i);
  const a=U.filter(i=>cur[i]),b=U.filter(i=>!cur[i]);
  if(!a.length||!b.length){cur=null;continue}
  let m2=null,l2=cl;const lm=LM&&rnd()<.6?lmove(cur,cl,U):null;
  if(lm){m2=lm.m;l2=lm.L}
  else{if(P.grp)m2=gmove(cur,a,new Set(U),cs);else if(P.iso)m2=imove(cur,a,new Set(U),cs);else{m2=cur.slice();m2[a[rnd()*a.length|0]]=0;m2[b[rnd()*b.length|0]]=1}
   if(m2&&LM){if(m2.some((x,i)=>x&&cl.hon[i]))m2=null;else l2=lstate(m2,cl.hon,cl.sg)}}
  if(!m2||!valid(m2)){if(++inv>40)cur=null;continue}
  const r2=sim(P,M,m2,cs,undefined,l2);if(r2.bug)throw Error('solver unsound');
  if(r2.rv>=cr.rv){cur=m2;cl=l2;cr=r2}}
 return cancel()?null:soft}
