/* [ui/board] 盤面画面の描画(draw)。G を読んで #g と #st(チップ)と各ボタンを更新する。 */
function draw(){if(!G)return;const{cfg,st,fl,num,mines,over,hint:h}=G,{R,C}=cfg,s=Math.min(40,Math.floor(Math.min(620,innerWidth-40)/C));
 const ns=h?h.ns:[],hr=h?h.rs:[];
 let o='',expl=0,flg=0;
 for(let i=0;i<G.N;i++){let cl='c',t='';if(fl[i]&&!st[i])flg++;
  if(st[i]==1){cl+=' o';t=num[i]||'';if(t)cl+=' n'+Math.min(t,8)}
  else if(st[i]==2){cl+=' x';t='💥';expl++}
  else if(over&&mines[i]){cl+=' o';t='💣'}else if(fl[i])t='🚩';
  if(ns.includes(i))cl+=' hsrc';
  o+='<div class="'+cl+'" data-i="'+i+'">'+t+'</div>'}
 const g=$('#g');g.style.setProperty('--s',s+'px');g.style.gridTemplateColumns='repeat('+C+','+s+'px)';g.innerHTML=o;
 const ch=(t,c,k)=>'<span class="chip '+(c||'')+'"'+(k?' data-k="'+k+'"':'')+'>'+t+'</span>';
 $('#st').innerHTML=ch(R+'×'+C)+ch('💣 残り '+(cfg.M-expl-flg),h&&h.c?'hl':'','c')+(run?ch('連続 '+run.streak+'/'+run.X)+ch('❤ '+run.lives)+ch('💡 '+run.hints):'')+(G.gf?'':ch('⚠ ノーゲス未達'))+(G.gf&&!G.q?ch('品質条件未達'):'');
 $('#rv').textContent='🧩 縛り ('+cfg.ids.length+')';$('#rv').className=hr.length?'hl':'';
 const fin=G.over||G.done,out=run&&run.hints<=0;if(fin||out)hm=0;$('#hb').disabled=fin||out;$('#hb').classList.toggle('on',!!hm);$('#hb').textContent='💡 ヒント '+(hm?'ON':'OFF')+(run?' (残り'+run.hints+')':'');
 let lab=null,nr=0;if(!run)lab='新しい盤面';else if(G.over||(G.done&&run.streak>=run.X)){lab='もう一度挑戦';nr=1}else if(G.done)lab='次の盤面';
 const nx=$('#nx');nx.hidden=!lab;nx.textContent=lab||'';nx.dataset.nr=nr}
