/* [game/code] 盤面コード: 盤面そのもの(爆弾位置・開始マス・縛り)を文字列にして保存/復元する。
   シードと違って gen を使わないので、生成側(gen/乱数/推論の強さ)を変えてもコードは壊れない。
   形式: MS1.<R>x<C>.<開始マス>.<縛りid,…>.<爆弾ビット列(6bit=1字)>.<品質 1|0>.<表示数字(嘘つき等で実際と違うときだけ。1字=1マス・36進)>
   読み込み時の確認(古いコード対策): 縛りが今も存在し併用できる / 爆弾数が合う / cons を満たす / 推論だけで完走できる。ダメなら弾く。
   この形式(MS1)は変えない。変えるなら版数を MS2 にして別に読む。 */
const CDABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const cdEnc=a=>{let s='';for(let i=0;i<a.length;i+=6){let x=0;for(let j=0;j<6;j++)x=x*2+(a[i+j]?1:0);s+=CDABC[x]}return s};
const cdDec=(s,n)=>{if(s.length!=Math.ceil(n/6))return null;const a=new Uint8Array(n);for(let i=0;i<n;i++){const k=CDABC.indexOf(s[i/6|0]);if(k<0)return null;a[i]=k>>(5-i%6)&1}return a};
function makeCode(){const{cfg,mines,num,act,sc,q}=G;
 return['MS1',cfg.R+'x'+cfg.C,sc,cfg.ids.join(','),cdEnc(Array.from(mines,x=>x?1:0)),q?1:0,num===act?'':Array.from(num,x=>x.toString(36)).join('')].join('.')}
/* 推論だけで完走できるか。ヒントと同じ deduce を使い、確定した安全マスを開け・爆弾に印を付けて繰り返す。真の配置と食い違えば false */
async function cdSolvable(P,N,M,mines,act,num,sc){const st=new Uint8Array(N);
 const open=i=>{const q=[i];while(q.length){const x=q.pop();if(st[x])continue;st[x]=1;if(!act[x])for(const y of P.nb[x])if(!st[y]&&!mines[y])q.push(y)}};
 open(sc);
 for(let r=0;r<=N;r++){let rest=0;for(let i=0;i<N;i++)if(!st[i]&&!mines[i])rest++;if(!rest)return true;
  let ch=0;for(const e of deduce(P,st,num,M,undefined,1)){if(st[e.i])continue;if(!!e.mine!=!!mines[e.i])return false;if(e.mine)st[e.i]=2;else open(e.i);ch=1}
  if(!ch)return false;await new Promise(ok=>setTimeout(ok))}
 return false}
/* コード文字列 → {cfg,res} か {err}。res は begin() にそのまま渡せる形 */
async function loadCode(text){
 const f=String(text||'').replace(/\s+/g,'').split('.'),bad=m=>({err:m}),BROKEN='盤面コードが壊れています',OLD='今のルールではこの盤面は成り立ちません(古いコードかもしれません)';
 if(f[0]!='MS1'||f.length!=7)return bad('盤面コードの形式が違います(全部貼れていますか?)');
 const m=/^(\d+)x(\d+)$/.exec(f[1]);if(!m)return bad(BROKEN);
 const R=+m[1],C=+m[2],N=R*C;
 if(R<3||C<3||R>24||C>24||!/^\d+$/.test(f[2])||+f[2]>=N)return bad(BROKEN);
 const sc=+f[2],ids=f[3]?f[3].split(','):[],gone=ids.filter(id=>!RULES[id]);
 if(gone.length)return bad('今のバージョンにない縛りが含まれています: '+gone.join(', '));
 if(new Set(ids).size!=ids.length)return bad(BROKEN);
 const mines=cdDec(f[4],N);if(!mines)return bad(BROKEN);
 let M=0;for(let i=0;i<N;i++)M+=mines[i];
 const cfg={R,C,M,ids,dropped:0};
 if(!M||mines[sc]||norm(ids,cfg).length!=ids.length||!mok(R,C,M,ids))return bad(OLD);
 let sh=null;if(f[6]){if(f[6].length!=N)return bad(BROKEN);sh=Array.from(f[6],ch=>parseInt(ch,36));if(sh.some(isNaN))return bad(BROKEN)}
 let P;try{P=prep(cfg)}catch(e){return bad(OLD)}
 for(const c of P.cons){let s=0;for(const j of c.cells)s+=mines[j];if(s<c.lo||s>c.hi)return bad(OLD)}
 const act=P.nb.map((_,i)=>ncount(P,mines,i)),num=sh||act;
 let ok=false;try{ok=await cdSolvable(P,N,M,mines,act,num,sc)}catch(e){}
 if(!ok)return bad('推論だけでは解けない盤面です(古いコード、または壊れたコード)');
 return{cfg,res:{mines,start:sc,L:sh&&{sh},gf:1,q:f[5]=='1',fc:1}}}
/* 「盤面コード」モードのスタート。エラーは設定画面に出して止める */
async function startCode(){const go=$('#go');go.disabled=true;go.textContent='検証中…';let r;
 try{r=await loadCode($('#cdi').value)}catch(e){r={err:'内部エラー: '+e.message}}
 go.textContent='スタート';upd();
 if(r.err){$('#mw').textContent='⚠ '+r.err;return}
 run=null;$('#nx').hidden=true;show('game');begin(r.cfg,r.res)}
