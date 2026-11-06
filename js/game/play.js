/* [game/play] 盤面の開始(生成呼び出し)・開く/旗・ヒント推論。G(今の盤面)を更新して draw() を呼ぶ。 */
/* start: 通常は gen で生成。sd(decodeSeed の結果)があれば生成せずその盤面で始める(フリープレイ扱い)。
   盤面を決める情報は必ず gen の返り値 res に入れる(seed.js の約束)。G を組み立てるのは begin だけ。 */
async function start(nr,sd){const ch=!sd&&mode()=='c',tk=++TK;
 if(ch&&(nr||!run))run={streak:0,lives:v('L'),hints:v('H'),X:v('X')};if(!ch)run=null;
 const cfg=sd?sd.cfg:plan(ch);G=null;hm=0;$('#g').innerHTML='';$('#st').innerHTML='';$('#nx').hidden=true;$('#hb').disabled=true;$('#sc').hidden=true;
 $('#rv').textContent='🧩 縛り ('+cfg.ids.length+')';msg('');
 let res=sd?sd.res:null;
 if(!sd){$('#ld').hidden=false;$('#ldt').textContent='ノーゲス盤面を探索中…';
  try{res=await gen(cfg,{cancel:()=>tk!=TK,tick:(el,n)=>{$('#ldt').textContent='ノーゲス盤面を探索中… '+(el/1000|0)+'秒 / 候補 '+n+'件'}})}
  catch(e){if(tk==TK){$('#ld').hidden=true;msg('内部エラー: '+e.message)}return}
  if(tk!=TK)return;$('#ld').hidden=true;
  if(!res)return msg('ノーゲスの盤面が見つかりませんでした(条件が厳しすぎる可能性)。「設定に戻る」で条件を変えてください')}
 begin(cfg,res)}
function begin(cfg,res){const P=prep(cfg),N=cfg.R*cfg.C,act=P.nb.map((_,i)=>ncount(P,res.mines,i)),num=res.L?res.L.sh:act;
 G={cfg,P,N,mines:res.mines,act,num,st:new Uint8Array(N),fl:new Uint8Array(N),rev:0,over:0,done:0,gf:res.gf,q:res.q,hint:null,seed:run?'':(()=>{try{return encodeSeed(cfg,res)}catch(e){return ''}})()};
 $('#sc').hidden=!G.seed; /* シードのコピーボタンはフリープレイ(と復元した盤面)だけ */
 flood(res.start);msg(cfg.dropped?cfg.dropped+'件の縛りは条件に合わないため外しました':'');draw()}
function flood(i){const q=[i],{st,fl,act:ac,mines,P}=G;while(q.length){const x=q.pop();if(st[x])continue;st[x]=1;fl[x]=0;G.rev++;if(!ac[x])for(const y of P.nb[x])if(!st[y]&&!mines[y])q.push(y)}}
function act(i,f){if(!G||G.over||G.done||G.st[i])return;G.hint=null;
 if(f){G.fl[i]=G.fl[i]==f?0:f;return draw()}if(G.fl[i])return; /* f: 0=開ける 1=旗 2=マーク。同じ種類をもう一度で外れ、別の種類なら置き換え */
 if(G.mines[i]){G.st[i]=2;if(run){run.lives--;if(run.lives<=0){G.over=1;msg('ゲームオーバー… 連続クリア '+run.streak+'回')}else msg('ミス! 残りライフ '+run.lives)}else{G.over=1;msg('爆発…')}}
 else flood(i);
 if(!G.over&&G.rev==G.N-G.cfg.M){G.done=1;if(run){run.streak++;msg(run.streak>=run.X?'🎉 目標達成! '+run.X+'連続クリア':'クリア! ('+run.streak+'/'+run.X+')')}else msg('🎉 クリア!')}
 draw()}
/* ヒント: ON中に 数字マス/縛り(一覧内)/残り爆弾数 をタップ。その手がかりから分かることがあるかだけ教える(場所は教えない) */
function hscan(){const{P,N,num,mines,fl,cfg}=G,st=G.st.slice(),out=[],seen=new Set();
 for(let i=0;i<N;i++)if(fl[i]==1&&mines[i]&&!st[i])st[i]=2; /* 正しい旗=既知の爆弾(マークは対象外) */
 for(let r=0;r<60;r++){const d=deduce(P,st,num,cfg.M,undefined,1),mk=[];
  for(const e of d){if(st[e.i])continue;const k=e.i+e.src.t+(e.src.id??e.src.i??'')+e.mine;if(!seen.has(k)){seen.add(k);out.push(e)}if(e.mine)mk.push(e.i)}
  if(!mk.length)break;for(const i of mk)st[i]=2}
 return out}
function ask(k,key){if(!G||G.over||G.done)return;
 if(run&&run.hints<=0)return msg('ヒントはもう使えません');
 const m=hscan().filter(e=>{const s=e.src;return k=='n'?(s.t=='n'&&s.i==key)||(s.t=='x'&&s.ns.includes(key)):k=='r'?(s.t=='r'&&s.id==key)||(s.t=='x'&&s.rs.includes(key)):s.t=='c'});
 if(run)run.hints--;
 const who=k=='n'?'この数字':k=='r'?'この縛り':'残り爆弾数';let t;
 if(!m.length){G.hint=null;t=who+'からは、いま分かることはありません'}
 else{const a=m.some(e=>e.mine),b=m.some(e=>!e.mine),w=a&&b?'爆弾と安全の両方':a?'爆弾':'安全',x=k!='c'&&Math.min(...m.map(e=>e.tier))==3;
  G.hint={ns:k=='n'?[key]:[],rs:k=='r'?[key]:[],c:k=='c'};
  t=who+'から、'+w+'と言い切れるマスがあります'+(x?'(ほかの手がかりとの組み合わせ)':'')}
 msg(t);if(k=='r')$('#mh').textContent=t;draw();if(k=='r')renderList()}
