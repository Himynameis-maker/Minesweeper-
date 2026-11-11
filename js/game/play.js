/* [game/play] 盤面の開始(生成呼び出し)・開く/旗・ヒント推論。G(今の盤面)を更新して draw() を呼ぶ。
   チャレンジの進行(run のライフ・ヒント・演出)は challenge.js。ここは呼ぶだけ。 */
/* nr=1: 新しい挑戦を始める / nr=0: 次の盤面へ。again=1: 同じ盤面枠のまま縛りなどを引き直す(チャレンジの「引き直す」) */
async function start(nr,again){const ch=mode()=='c',tk=++TK;
 if(ch){if(nr||!run||run.end)chNewRun();if(!again)chNewBoard()}else run=null;
 const cfg=plan(ch);G=null;hm=0;cpUpd();$('#g').innerHTML='';$('#st').innerHTML='';$('#nx').hidden=true;$('#hb').disabled=true;$('#fin').hidden=true;
 $('#rv').textContent=tx('🧩 縛り ({n})',{n:cfg.ids.length});msg('');$('#ld').hidden=false;$('#rg').hidden=true;$('#ldt').textContent=tx('ノーゲス盤面を探索中…');
 let res=null;
 try{res=await gen(cfg,{cancel:()=>tk!=TK,tick:(el,n)=>{$('#ldt').textContent=tx('ノーゲス盤面を探索中… {s}秒 / 候補 {n}件',{s:el/1000|0,n});if(ch&&el>=CHALLENGE.regenSec*1000)$('#rg').hidden=false}})}
 catch(e){if(tk==TK){if(ch){$('#ldt').textContent=tx('内部エラー: {m}',{m:e.message});$('#rg').hidden=false}else{$('#ld').hidden=true;msg(tx('内部エラー: {m}',{m:e.message}))}}return}
 if(tk!=TK)return;
 if(!res){if(ch){$('#ldt').textContent=tx('盤面検索難航中…「引き直す」でもう一度抽選できます');$('#rg').hidden=false;return}
  $('#ld').hidden=true;return msg(tx('ノーゲスの盤面が見つかりませんでした(条件が厳しすぎる可能性)。「設定に戻る」で条件を変えてください'))}
 $('#ld').hidden=true;$('#rg').hidden=true;
 setBoard(cfg,res);msg(ch?tx('第{n}盤面スタート',{n:run.stage}):cfg.dropped?tx('{n}件の縛りは条件に合わないため外しました',{n:cfg.dropped}):'');draw()}
/* 盤面を G に作って開始マスを開く。gen の返り値でも、boardDecode の res(盤面コード由来。デイリー)でも同じ形で渡せる */
function setBoard(cfg,res){const P=prep(cfg),N=cfg.R*cfg.C,act=P.nb.map((_,i)=>ncount(P,res.mines,i)),num=res.L?res.L.sh:act;
 let code=null;try{code=boardEncode(cfg,res)}catch(e){} /* 盤面コード(ui/copycode のコピーボタン用。作れなければ null=ボタンを出さない) */
 G={cfg,P,N,mines:res.mines,act,az:P.mir&&res.L?num:act,num,st:new Uint8Array(N),fl:new Uint8Array(N),rev:0,over:0,done:0,gf:res.gf,q:res.q,hint:null,code};
 flood(res.start);
 /*[s1]*/if(P.s1)try{ /* 開始マスだけ開く縛り(均一な配置): 最初の1マスの数字から確実に安全と言えるマスも、最初から開けておく(1マスだけだと毎回ほぼ同じ出だしで寂しいため)。
   盤面コードに入れなくても、盤面と開始マスから毎回同じ結果になる。推論は gen の sim の最初の1手と同じなので、ノーゲスは崩れない */
  for(const e of deduce(P,G.st,num,cfg.M))if(!e.mine&&!res.mines[e.i]&&!G.st[e.i])flood(e.i)}catch(e){}}
function flood(i){const q=[i],{st,fl,mines,P}=G,ac=G.az||G.act; /* az=数字0の自動開放に使う値。鏡爆弾のときだけ「見えている数字」(それ以外は act と同じ) */while(q.length){const x=q.pop();if(st[x])continue;st[x]=1;fl[x]=0;G.rev++;if(!ac[x])for(const y of P.nb[x])if(!st[y]&&!mines[y])q.push(y)}}
/* チャレンジ: ミスもクリアも盤面はそこで終わり(ミス=爆発して全開示、フリープレイと同じ)。次の盤面は「次の盤面」ボタン */
function act(i,f){if(!G||G.over||G.done||G.st[i])return;G.hint=null;
 if(f){G.fl[i]=G.fl[i]==f?0:f;draw();return}if(G.fl[i])return; /* f: 0=開ける 1=旗 2=マーク。同じ種類をもう一度で外れ、別の種類なら置き換え */
 if(G.mines[i]){G.st[i]=2;G.over=1;if(run)chMiss();else msg(tx('爆発…'))}
 else flood(i);
 if(!G.over&&G.rev==G.N-G.cfg.M){G.done=1;if(run)chClear();else msg(tx('🎉 クリア!'))}
 draw();if(DY&&(G.over||G.done))dyEnd()} /* デイリー: ミスもクリアもここで終わり(ui/daily.js) */
/* スマート開示: 開いている数字マスの周りの旗(🚩のみ。マークは数えない)の数が、その数字と同じなら、周りの残りの未開マスを開く。
   旗の数え方は数字と同じ ncount を通すので、2倍の爆弾や十字・ナイトの数え方もそのまま効く。旗が間違っていれば爆発する。 */
function chord(i){if(!G||G.over||G.done||G.st[i]!=1||!G.num[i])return;const{P,st,fl,mines}=G,f=new Uint8Array(G.N);
 for(let j=0;j<G.N;j++)if(fl[j]==1)f[j]=1;
 if(ncount(P,f,i)!=G.num[i])return;
 const t=P.nb[i].filter(j=>!st[j]&&!fl[j]);if(!t.length)return;
 G.hint=null;
 for(const j of t){if(st[j])continue;if(mines[j]){st[j]=2;G.over=1}else flood(j)}
 if(G.over){if(run)chMiss();else msg(tx('爆発…'))}
 else if(G.rev==G.N-G.cfg.M){G.done=1;if(run)chClear();else msg(tx('🎉 クリア!'))}
 draw();if(DY&&(G.over||G.done))dyEnd()}
/* ヒント: ON中に 数字マス/縛り(一覧内)/残り爆弾数 をタップ。その手がかりから分かることがあるかだけ教える(場所は教えない) */
function hscan(){const{P,N,num,mines,fl,cfg}=G,st=G.st.slice(),out=[],seen=new Set();
 for(let i=0;i<N;i++)if(fl[i]==1&&mines[i]&&!st[i])st[i]=2; /* 正しい旗=既知の爆弾(マークは対象外) */
 for(let r=0;r<60;r++){const d=deduce(P,st,num,cfg.M,undefined,1),mk=[];
  for(const e of d){if(st[e.i])continue;const k=e.i+e.src.t+(e.src.id??e.src.i??'')+e.mine;if(!seen.has(k)){seen.add(k);out.push(e)}if(e.mine)mk.push(e.i)}
  if(!mk.length)break;for(const i of mk)st[i]=2}
 return out}
function ask(k,key){if(!G||G.over||G.done)return;
 if(run&&run.hints<=0)return msg(tx('この盤面のヒントは使い切ったよ'));
 const m=hscan().filter(e=>{const s=e.src;return k=='n'?(s.t=='n'&&s.i==key)||(s.t=='x'&&s.ns.includes(key)):k=='r'?(s.t=='r'&&s.id==key)||(s.t=='x'&&s.rs.includes(key)):s.t=='c'});
 if(run){run.hints--;if(run.hints<=0)hm=0}
 const who=tx(k=='n'?'この数字':k=='r'?'この縛り':'残り爆弾数');let t;
 if(!m.length){G.hint=null;t=tx('{w}からは、いま分かることはありません',{w:who})}
 else{const a=m.some(e=>e.mine),b=m.some(e=>!e.mine),w=a&&b?'爆弾と安全の両方':a?'爆弾':'安全',x=k!='c'&&Math.min(...m.map(e=>e.tier))==3;
  G.hint={ns:k=='n'?[key]:[],rs:k=='r'?[key]:[],c:k=='c'};
  t=tx(x?'{w}から、{x}と言い切れるマスがあります(ほかの手がかりとの組み合わせ)':'{w}から、{x}と言い切れるマスがあります',{w:who,x:w,c:a&&b?2:a?0:1})}
 msg(t);if(k=='r')$('#mh').textContent=t;draw();if(k=='r')renderList()}
