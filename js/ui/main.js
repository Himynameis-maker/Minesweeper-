/* [ui/main] 設定画面の更新(upd)・モード切替・検査レポート欄・全イベント配線(load)。 */
const rep=()=>{const t=buildReport();$('#ctx').value=t;return t};
function upd(){const p=problems();$('#mw').innerHTML=p.map(x=>'⚠ '+x).join('<br>');$('#go').disabled=mode()=='k'?!$('#cdi').value.trim():p.length>0}
function cancelGen(){TK++;$('#ld').hidden=true;show('setup')}
function setMode(m){const c=m=='c',k=m=='k'; /* m: 'f' フリープレイ / 'c' チャレンジ / 'k' 盤面コード */
 $('#mc').classList.toggle('on',c);$('#mcd').classList.toggle('on',k);$('#mf').classList.toggle('on',m=='f');
 $('#chs').hidden=!c;$('#cds').hidden=!k;$('#cb').hidden=k;$('#cr').hidden=k;
 $('#rcap').textContent=c?'チャレンジ: 選んだ縛りの中から、盤面ごとにランダムで決まります(爆弾数は縛りに合わせて自動で調整)':'フリープレイ: 選んだ縛りを全部適用します(爆弾数などが縛りに合わないときはスタートできません)';upd()}
window.addEventListener('load',()=>{
 if(RULE_ERR.length)$('#sm').textContent='ルール登録エラー: '+RULE_ERR.join(' / ');
 setMode('f');updSel();
 for(const id of['R','C','M'])$('#'+id).addEventListener('input',upd);
 $('#mf').onclick=()=>setMode('f');$('#mc').onclick=()=>setMode('c');$('#mcd').onclick=()=>setMode('k');$('#cdi').addEventListener('input',upd);
 $('#pk').onclick=()=>openM('pick');$('#rv').onclick=()=>G&&openM('view');
 $('#mx').onclick=$('#mok').onclick=closeM;$('#md').onclick=e=>{if(e.target.id=='md')closeM()};
 $('#mq').oninput=renderList;
 longpress($('#ml'),'.ri',e=>showEx([e.dataset.rid],'縛りの例'));longpress($('#rv'),'#rv',()=>G&&showEx(G.cfg.ids,'この盤面の縛りの例'));
 $('#ex2').onclick=()=>$('#ex').hidden=true;$('#ex').onclick=e=>{if(e.target.id=='ex')$('#ex').hidden=true};
 $('#ml').onchange=e=>{const id=e.target.dataset.id;if(id){e.target.checked?SEL.add(id):SEL.delete(id);renderList()}};
 $('#ma').onclick=()=>{vis().forEach(r=>{if(!blockers(r.id).length)SEL.add(r.id)});renderList()};$('#mn').onclick=()=>{vis().forEach(r=>SEL.delete(r.id));renderList()};
 $('#go').onclick=()=>{if(mode()=='k')return startCode();if(problems().length)return upd();show('game');start(1)};$('#bk').onclick=cancelGen;$('#lc').onclick=cancelGen;
 $('#nx').onclick=()=>start(+$('#nx').dataset.nr);$('#rp').onclick=replay;
 $('#cp').onclick=()=>{if(!G)return;const t=makeCode(); /* 成功時は無反応。コピーできない環境のときだけ手動コピー用に表示 */
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(()=>prompt('盤面コード(コピーして使ってください)',t))};
 $('#hb').onclick=()=>{if(!G||G.over||G.done)return;hm=hm?0:1;msg(hm?'ヒントON: 数字のマス・縛り(🧩の中)・残り爆弾数をタップ'+(run?'(1回につきヒント1回消費)':''):'');draw()};
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
