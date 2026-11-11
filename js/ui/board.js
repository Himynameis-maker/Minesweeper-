/* [ui/board] 盤面画面の描画(draw)。G を読んで #g と #st(チップ)と各ボタンを更新する。 */
/* [wt] 重みが2以上のマス(色つきマス)の薄い塗り。CSSを触らずに済むよう inline で背景画像として重ねる。プレイ中は未開のマスだけ塗る。ミス/クリアで全開放したときは、開いたマス・爆弾・爆発したマスも含めて全体に塗る(市松模様が盤面全体に戻る) */
const WTST=' style="background-image:linear-gradient(rgba(255,150,0,.28),rgba(255,150,0,.28))"';
function draw(){if(!G)return;const{cfg,st,fl,num,mines,hint:h}=G,{R,C}=cfg,s=Math.min(40,Math.floor(Math.min(620,document.documentElement.clientWidth-40)/C));
 const ns=h?h.ns:[],hr=h?h.rs:[],wt=G.P.w,fin=G.over||G.done; /* fin=ミスかクリアで終わった盤面。全マスを開いて見せる */
 let o='',expl=0,flg=0;
 for(let i=0;i<G.N;i++){let cl='c',t='',tint=wt&&wt[i]>1&&(fin||!st[i]);if(fl[i]==1&&!st[i])flg++; /* 残り爆弾数に数えるのは旗(1)だけ。マーク(2)は数えない */
  if(st[i]==2){cl+=' x';t='<i class="px ex"></i>';expl++}
  else if(fin||st[i]==1){cl+=' o';if(mines[i])t='<i class="px bm"></i>';else{t=num[i]||'';if(t)cl+=' n'+Math.min(t,8)}} /* 終了時は旗・マークも外して全マスを開いた見た目にする。数字はプレイ中に見えていたもの(num)と同じ */
  else if(fl[i])t=fl[i]==2?'<i class="px fg mk"></i>':'<i class="px fg"></i>';
  if(ns.includes(i))cl+=' hsrc';
  o+='<div class="'+cl+'" data-i="'+i+'"'+(tint?WTST:'')+'>'+t+'</div>'}
 const g=$('#g');g.style.setProperty('--s',s+'px');g.style.gridTemplateColumns='repeat('+C+','+s+'px)';g.innerHTML=o;
 const ch=(t,c,k)=>'<span class="chip '+(c||'')+'"'+(k?' data-k="'+k+'"':'')+'>'+t+'</span>';
 /* チャレンジ: 第N盤面 / 連続クリア(●=クリア済) / ライフ / この盤面のヒント残り */
 const rc=run?ch(tx(CHALLENGE.missResetsStreak?'✅ 連続クリア {a}/{b}':'✅ クリア {a}/{b}',{a:run.streak,b:run.X}),'clr')+ch(tx('第{n}盤面',{n:run.stage}))+ch('❤ '+run.lives+'/'+CHALLENGE.lives)+ch('💡 '+run.hints+'/'+CHALLENGE.hints):'';
 $('#st').innerHTML=ch(R+'×'+C)+ch(tx('💣 残り {n}',{n:cfg.M-expl-flg}),h&&h.c?'hl':'','c')+rc+(G.gf?'':ch(tx('⚠ ノーゲス未達')))+(G.gf&&!G.q?ch(tx('品質条件未達')):'');
 $('#rv').textContent=tx('🧩 縛り ({n})',{n:cfg.ids.length});$('#rv').className=hr.length?'hl':'';
 const out=run&&run.hints<=0;if(fin||out)hm=0;$('#hb').disabled=fin||out;$('#hb').classList.toggle('on',!!hm);$('#hb').textContent=tx(run?'💡 ヒント {o} (残り{n})':'💡 ヒント {o}',{o:hm?'ON':'OFF',n:run?run.hints:0});
 /* 次へボタン: フリープレイ=いつでも「新しい盤面」。チャレンジ=クリアでもミスでも「次の盤面」(挑戦が終わったら出さない。終了演出のボタンを使う) */
 let lab=null;if(DY){}else if(!run)lab=tx('新しい盤面');else if(!run.end&&fin)lab=tx('次の盤面');
 const nx=$('#nx');nx.hidden=!lab;nx.textContent=lab||'';nx.dataset.nr=0;cpUpd()}
