/* [ui/main] 設定画面の更新(upd)・モード切替・検査レポート欄・全イベント配線(load)。 */
const rep=()=>{const t=buildReport();$('#ctx').value=t;return t};
function upd(){const p=problems();$('#mw').innerHTML=p.map(x=>'⚠ '+x).join('<br>');$('#go').disabled=p.length>0}
function cancelGen(){TK++;$('#ld').hidden=true;$('#rg').hidden=true;chSetup();show('setup')}
/* m: 'f'=フリープレイ 'c'=チャレンジ 'd'=デイリー(true/false は旧呼び出し用。true=チャレンジ, false=フリープレイ) */
function setMode(m){if(m===true)m='c';else if(!m)m='f';const c=m=='c',d=m=='d';
 $('#mf').classList.toggle('on',m=='f');$('#mc').classList.toggle('on',c);$('#mdy').classList.toggle('on',d);
 $('#chi').hidden=!c;$('#cbd').hidden=$('#crl').hidden=c||d;$('#go').hidden=$('#gor').hidden=d;$('#dyc').hidden=!d;$('#go').textContent=tx(c?'🔥 チャレンジ開始':'スタート');
 $('#rcap').textContent=tx('フリープレイ: 選んだ縛りを全部適用します(爆弾数などが縛りに合わないときはスタートできません)');if(c)chSetup();if(d)dyOpen();else dyClose();upd()}
window.addEventListener('load',()=>{
 if(RULE_ERR.length)$('#sm').textContent=tx('ルール登録エラー: {e}',{e:RULE_ERR.join(' / ')});
 /* 検査レポート欄は ?repo(または #repo)をつけて開いたときだけ出す。例: https://…/?repo */
 try{if(typeof location!='undefined'&&(/[?&]repo(=|&|$)/.test(location.search||'')||location.hash=='#repo'))$('#rpt').hidden=false}catch(e){}
 setMode(false);updSel();
 /* ボタン(開ける/旗/マーク/縛りを選ぶ/縛り/ヒント/今日の縛り)の絵文字をドット絵にする。i18nDom の英語化のあと(load)に、今の文字をそのまま変換する */
 for(const s of['#fo','#ff','#fk','#pk','#rv','#hb','#dyu'])$(s).innerHTML=pxi($(s).innerHTML.replace('<span class="mk">🚩</span>','<i class="px fg mk inl"></i>'));
 for(const id of['S','M'])$('#'+id).addEventListener('input',upd);
 $('#mf').onclick=()=>setMode('f');$('#mc').onclick=()=>setMode('c');$('#mdy').onclick=()=>setMode('d');
 $('#pk').onclick=()=>openM('pick');$('#rv').onclick=()=>G&&openM('view');
 $('#mx').onclick=$('#mok').onclick=closeM;$('#md').onclick=e=>{if(e.target.id=='md')closeM()};
 $('#mq').oninput=renderList;
 longpress($('#ml'),'.ri',e=>showEx([e.dataset.rid],tx('縛りの例')));longpress($('#rv'),'#rv',()=>G&&showEx(G.cfg.ids,tx('この盤面の縛りの例')));
 $('#ex2').onclick=()=>$('#ex').hidden=true;$('#ex').onclick=e=>{if(e.target.id=='ex')$('#ex').hidden=true};
 $('#ml').onchange=e=>{const id=e.target.dataset.id;if(id){e.target.checked?SEL.add(id):SEL.delete(id);renderList()}};
 $('#ma').onclick=()=>{vis().forEach(r=>{if(!blockers(r.id).length)SEL.add(r.id)});renderList()};$('#mn').onclick=()=>{vis().forEach(r=>SEL.delete(r.id));renderList()};
 $('#go').onclick=()=>{if(FC)return fcStart();if(problems().length)return upd();show('game');start(1)};$('#bk').onclick=cancelGen;$('#lc').onclick=cancelGen;
 $('#nx').onclick=()=>start(+$('#nx').dataset.nr);
 $('#rg').onclick=()=>start(0,1);$('#finr').onclick=()=>DY?dyRetry():start(1);$('#finb').onclick=()=>DY?dyLeave():chLeave();
 $('#hb').onclick=()=>{if(!G||G.over||G.done)return;hm=hm?0:1;msg(hm?tx(run?'ヒントON: 数字のマス・縛り(🧩の中)・残り爆弾数をタップ(1回タップでヒント1回消費・この盤面あと{n}回)':'ヒントON: 数字のマス・縛り(🧩の中)・残り爆弾数をタップ',{n:run?run.hints:0}):'');draw()};
 $('#st').onclick=e=>{if(hm&&e.target.closest('[data-k=c]'))ask('c')};
 $('#ml').addEventListener('click',e=>{if(MODE!='view'||!hm)return;const t=e.target.closest('.ri');if(t)ask('r',t.dataset.rid)});
 const setFm=n=>{fm=n;['#fo','#ff','#fk'].forEach((s,k)=>$(s).classList.toggle('on',k==n))};
 $('#fo').onclick=()=>setFm(0);$('#ff').onclick=()=>setFm(1);$('#fk').onclick=()=>setFm(2);
 $('#g').onclick=e=>{const i=e.target.dataset.i;if(i===undefined)return;if(hm&&G&&G.st[+i]==1&&G.num[+i])return ask('n',+i);act(+i,fm)};
 $('#g').oncontextmenu=e=>{e.preventDefault();const i=e.target.dataset.i;if(i!==undefined)act(+i,fm||1)}; /* 右クリック=今選んでいる印を立てる(開けるモード中は旗) */
 /* 検査レポート: 実行→表示、コピー、ダウンロード */
 $('#cg').onclick=()=>{const t=rep();$('#ctx').select();try{navigator.clipboard.writeText(t)}catch(e){}};
 $('#ct').onclick=async()=>{$('#ctx').value='検査中…(数十秒〜数分かかります)';await selfTest();rep()};
 $('#cd').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rep()],{type:'text/markdown'}));a.download='report.md';a.click()};
 rep()});
