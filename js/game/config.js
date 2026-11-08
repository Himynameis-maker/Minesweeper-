/* [game/config] 設定画面の入力 → 盤面設定 cfg={R,C,M,ids}。縛りの選び方・併用不可の除外・爆弾数調整。
   フリープレイ=選んだ縛りを全部適用(合わなければ problems で開始を止める) / チャレンジ=全縛りから抽選(chPlan。数値は challenge.js の CHALLENGE)。 */
function norm(ids,cfg){const o=[];for(const id of ids){const r=RULES[id];if(r.ok&&!r.ok(cfg))continue;if(o.some(x=>conflict(RULES[x],r)))continue;o.push(id)}return o}
function pick(pool,k,cfg){let o;for(let t=0;t<3;t++){let c=pool.filter(id=>!RULES[id].ok||RULES[id].ok(cfg));o=[];
 while(o.length<k&&c.length){const w=c.map(id=>1+(AGE[id]??3));let t2=rnd()*w.reduce((a,b)=>a+b),j=0;while((t2-=w[j])>0&&j<c.length-1)j++;
  const id=c[j];o.push(id);c=c.filter(x=>x!=id&&!conflict(RULES[id],RULES[x]))}
 if(o.slice().sort()+''!=LAST)break}
 LAST=o.slice().sort()+'';for(const id in RULES)AGE[id]=o.includes(id)?0:(AGE[id]??3)+1;return o}
/* チャレンジ: 盤面サイズ・爆弾率・縛りの数をランダムに決め、縛りを抽選。爆弾数が縛りに合わなければ前後どちらか(ランダム)にずらし、合わなくなった縛りは外す。
   縛りが1個も残らなかったら(rulesMin未満)最大10回まで引き直す */
function chPlan(){const c=CHALLENGE,ri=(a,b)=>a+(rnd()*(b-a+1)|0);let cfg;
 for(let t=0;t<10;t++){
  const R=ri(c.sizeMin,c.sizeMax),C=c.square?R:ri(c.sizeMin,c.sizeMax),N=R*C,
   M=Math.max(1,Math.min(N-12,Math.round(N*(c.bombMin+rnd()*(c.bombMax-c.bombMin)))));
  cfg={R,C,M,ids:[],dropped:0};
  cfg.ids=pick(Object.keys(RULES),ri(c.rulesMin,c.rulesMax),cfg);
  if(!mok(R,C,cfg.M,cfg.ids)){const{lo,hi}=mnear(R,C,cfg.M,cfg.ids,N-12),o=[lo,hi].filter(Boolean);
   cfg.M=o.length?o[rnd()*o.length|0]:mfit(cfg.M,cfg.ids,N)}
  cfg.ids=cfg.ids.filter(id=>!RULES[id].ok||RULES[id].ok(cfg));
  if(cfg.ids.length>=c.rulesMin)break}
 return cfg}
/* フリープレイの盤面サイズは入力1つ(#S=縦と横の長さ)。内部の cfg は R と C を別々に持ち、同じ値を入れる(縦横を分けたくなったら入力欄を戻すだけ) */
function plan(ch){if(ch)return chPlan();
 const R=Math.max(3,Math.min(24,v('S'))),C=R,N=R*C,M=Math.max(1,Math.min(N-10,v('M'))),
  pool=Object.keys(RULES).filter(id=>SEL.has(id)),cfg={R,C,M,ids:[]};
 cfg.ids=norm(pool,cfg);cfg.dropped=pool.length-cfg.ids.length;return cfg}
/* フリープレイ: 選んだ縛りが今の盤面・爆弾数に合わないとき、理由を返す(スタートを止める) */
function freeCfg(){const R=Math.max(3,Math.min(24,v('S')||3)),C=R,N=R*C;return{R,C,M:Math.max(1,Math.min(N-10,v('M')||1)),ids:[...SEL]}}
function problems(){if(mode()!='f'||FC)return[]; /* FC=盤面コードを貼っている間は、盤面はコードで決まるので縛りの検査はしない(ui/freecode.js) */
 const cfg=freeCfg(),{R,C,M}=cfg,max=Math.max(1,R*C-10),o=[],fx=[];
 for(const id of SEL){const r=RULES[id];let f=0;for(let m=1;m<=max&&!f;m++)if(mok(R,C,m,[id]))f=1;
  if(f)fx.push(id);else o.push('「'+r.name+'」: '+(r.why||'今の盤面では使えません'))}
 if(fx.length&&!mok(R,C,M,fx)){const{lo,hi}=mnear(R,C,M,fx,max),a=[lo&&lo+'個',hi&&hi+'個'].filter(Boolean);
  o.push(a.length?'爆弾数'+M+'個は選んだ縛りに合いません → '+a.join(' か '):'選んだ縛りに合う爆弾数がありません')}
 return o}
