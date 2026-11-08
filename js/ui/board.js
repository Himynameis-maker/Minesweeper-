/* [ui/board] 盤面画面の描画(draw)。G を読んで #g と #st(チップ)と各ボタンを更新する。 */
/* [wt] 重みが2以上のマス(色つきマス)の薄い塗り。CSSを触らずに済むよう inline で背景画像として重ねる。開いた/爆発/公開された爆弾のマスは塗らない(白のまま) */
const WTST=' style="background-image:linear-gradient(rgba(255,150,0,.28),rgba(255,150,0,.28))"';
function draw(){if(!G)return;const{cfg,st,fl,num,mines,over,hint:h}=G,{R,C}=cfg,s=Math.min(40,Math.floor(Math.min(620,innerWidth-40)/C));
 const ns=h?h.ns:[],hr=h?h.rs:[],wt=G.P.w;
 let o='',expl=0,flg=0;
 for(let i=0;i<G.N;i++){let cl='c',t='',tint=wt&&wt[i]>1&&!st[i]&&!(over&&mines[i]);if(fl[i]==1&&!st[i])flg++; /* 残り爆弾数に数えるのは旗(1)だけ。マーク(2)は数えない */
  if(st[i]==1){cl+=' o';t=num[i]||'';if(t)cl+=' n'+Math.min(t,8)}
  else if(st[i]==2){cl+=' x';t='💥';expl++}
  else if(over&&mines[i]){cl+=' o';t='💣'}else if(fl[i])t=fl[i]==2?'<span class="mk">🚩</span>':'🚩';
  if(ns.includes(i))cl+=' hsrc';
  o+='<div class="'+cl+'" data-i="'+i+'"'+(tint?WTST:'')+'>'+t+'</div>'}
 const g=$('#g');g.style.setProperty('--s',s+'px');g.style.gridTemplateColumns='repeat('+C+','+s+'px)';g.innerHTML=o;
 const ch=(t,c,k)=>'<span class="chip '+(c||'')+'"'+(k?' data-k="'+k+'"':'')+'>'+t+'</span>';
 /* チャレンジ: 第N盤面 / 連続クリア(●=クリア済) / ライフ / この盤面のヒント残り */
 const rc=run?ch((CHALLENGE.missResetsStreak?'✅ 連続クリア ':'✅ クリア ')+run.streak+'/'+run.X,'clr')+ch('第'+run.stage+'盤面')+ch('❤ '+run.lives+'/'+CHALLENGE.lives)+ch('💡 '+run.hints+'/'+CHALLENGE.hints):'';
 $('#st').innerHTML=ch(R+'×'+C)+ch('💣 残り '+(cfg.M-expl-flg),h&&h.c?'hl':'','c')+rc+(G.gf?'':ch('⚠ ノーゲス未達'))+(G.gf&&!G.q?ch('品質条件未達'):'');
 $('#rv').textContent='🧩 縛り ('+cfg.ids.length+')';$('#rv').className=hr.length?'hl':'';
 const fin=G.over||G.done,out=run&&run.hints<=0;if(fin||out)hm=0;$('#hb').disabled=fin||out;$('#hb').classList.toggle('on',!!hm);$('#hb').textContent='💡 ヒント '+(hm?'ON':'OFF')+(run?' (残り'+run.hints+')':'');
 /* 次へボタン: フリープレイ=いつでも「新しい盤面」。チャレンジ=クリアでもミスでも「次の盤面」(挑戦が終わったら出さない。終了演出のボタンを使う) */
 let lab=null;if(DY){}else if(!run)lab='新しい盤面';else if(!run.end&&fin)lab='次の盤面';
 const nx=$('#nx');nx.hidden=!lab;nx.textContent=lab||'';nx.dataset.nr=0}
