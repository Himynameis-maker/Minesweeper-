/* [game/config] 設定画面の入力 → 盤面設定 cfg={R,C,M,ids}。縛りの選び方・併用不可の除外・爆弾数調整。
   フリープレイ=選んだ縛りを全部適用(合わなければ problems で開始を止める) / チャレンジ=プールから抽選(pick)。 */
function norm(ids,cfg){const o=[];for(const id of ids){const r=RULES[id];if(r.ok&&!r.ok(cfg))continue;if(o.some(x=>conflict(RULES[x],r)))continue;o.push(id)}return o}
function pick(pool,k,cfg){let o;for(let t=0;t<3;t++){let c=pool.filter(id=>!RULES[id].ok||RULES[id].ok(cfg));o=[];
 while(o.length<k&&c.length){const w=c.map(id=>1+(AGE[id]??3));let t2=rnd()*w.reduce((a,b)=>a+b),j=0;while((t2-=w[j])>0&&j<c.length-1)j++;
  const id=c[j];o.push(id);c=c.filter(x=>x!=id&&!conflict(RULES[id],RULES[x]))}
 if(o.slice().sort()+''!=LAST)break}
 LAST=o.slice().sort()+'';for(const id in RULES)AGE[id]=o.includes(id)?0:(AGE[id]??3)+1;return o}
function plan(ch){let R=Math.max(3,Math.min(24,v('R'))),C=Math.max(3,Math.min(24,v('C'))),k=v('K'),ratio=v('M')/(R*C),n=ch?run.streak:0;
 if(ch){if(chk('prog')){R=Math.min(20,R+(n/2|0));C=Math.min(20,C+(n/2|0));ratio=Math.min(.28,ratio+.01*n);k+=n/3|0}
  if(chk('rs')){R=5+(rnd()*8|0);C=5+(rnd()*8|0)}if(chk('rm'))ratio=.12+rnd()*.1;if(chk('rk'))k=1+(rnd()*3|0)}
 const N=R*C,M=ch?Math.max(1,Math.min(N-12,Math.round(N*ratio))):Math.max(1,Math.min(N-10,v('M')));
 const pool=Object.keys(RULES).filter(id=>SEL.has(id)),cfg={R,C,M,ids:[]};
 cfg.ids=ch?pick(pool,k,cfg):norm(pool,cfg);cfg.dropped=ch?0:pool.length-cfg.ids.length;
 /* チャレンジ: 選ばれた縛りに合う最寄りの爆弾数(前後の近い方)に合わせ、合わなくなった縛りは外す */
 if(ch){if(!mok(R,C,cfg.M,cfg.ids)){const{lo,hi}=mnear(R,C,cfg.M,cfg.ids,N-12),c=[lo,hi].filter(Boolean).sort((a,b)=>Math.abs(a-cfg.M)-Math.abs(b-cfg.M));cfg.M=c.length?c[0]:mfit(cfg.M,cfg.ids,N)}cfg.ids=cfg.ids.filter(id=>!RULES[id].ok||RULES[id].ok(cfg))}
 return cfg}
/* フリープレイ: 選んだ縛りが今の盤面・爆弾数に合わないとき、理由を返す(スタートを止める) */
function freeCfg(){const R=Math.max(3,Math.min(24,v('R')||3)),C=Math.max(3,Math.min(24,v('C')||3)),N=R*C;return{R,C,M:Math.max(1,Math.min(N-10,v('M')||1)),ids:[...SEL]}}
function problems(){if(mode()!='f')return[];const cfg=freeCfg(),{R,C,M}=cfg,max=Math.max(1,R*C-10),o=[],fx=[];
 for(const id of SEL){const r=RULES[id];let f=0;for(let m=1;m<=max&&!f;m++)if(mok(R,C,m,[id]))f=1;
  if(f)fx.push(id);else o.push('「'+r.name+'」: '+(r.why||'今の盤面では使えません'))}
 if(fx.length&&!mok(R,C,M,fx)){const{lo,hi}=mnear(R,C,M,fx,max),a=[lo&&lo+'個',hi&&hi+'個'].filter(Boolean);
  o.push(a.length?'爆弾数'+M+'個は選んだ縛りに合いません → '+a.join(' か '):'選んだ縛りに合う爆弾数がありません')}
 return o}
