/* [ui/main] 設定画面の更新(upd)・モード切替・検査レポート欄・全イベント配線(load)。 */
const rep=()=>{const t=buildReport();$('#ctx').value=t;return t};
function upd(){const p=problems();$('#mw').innerHTML=p.map(x=>'⚠ '+x).join('<br>');$('#go').disabled=p.length>0}
function cancelGen(){TK++;$('#ld').hidden=true;show('setup')}
function setMode(c){$('#mc').classList.toggle('on',c);$('#mf').classList.toggle('on',!c);$('#chs').hidden=!c;
 $('#rcap').textContent=c?'チャレンジ: 選んだ縛りの中から、盤面ごとにランダムで決まります(爆弾数は縛りに合わせて自動で調整)':'フリープレイ: 選んだ縛りを全部適用します(爆弾数などが縛りに合わないときはスタートできません)';upd()}
window.addEventListener('load',()=>{
 if(RULE_ERR.length)$('#sm').textContent='ルール登録エラー: '+RULE_ERR.join(' / ');
 setMode(false);updSel();
 for(const id of['R','C','M'])$('#'+id).addEventListener('input',upd);
 $('#mf').onclick=()=>setMode(false);$('#mc').onclick=()=>setMode(true);
 $('#pk').onclick=()=>openM('pick');$('#rv').onclick=()=>G&&openM('view');
 $('#mx').onclick=$('#mok').onclick=closeM;$('#md').onclick=e=>{if(e.target.id=='md')closeM()};
 $('#mq').oninput=renderList;
 longpress($('#ml'),'.ri',e=>showEx([e.dataset.rid],'縛りの例'));longpress($('#rv'),'#rv',()=>G&&showEx(G.cfg.ids,'この盤面の縛りの例'));
 $('#ex2').onclick=()=>$('#ex').hidden=true;$('#ex').onclick=e=>{if(e.target.id=='ex')$('#ex').hidden=true};
 $('#ml').onchange=e=>{const id=e.target.dataset.id;if(id){e.target.checked?SEL.add(id):SEL.delete(id);renderList()}};
 $('#ma').onclick=()=>{vis().forEach(r=>{if(!blockers(r.id).length)SEL.add(r.id)});renderList()};$('#mn').onclick=()=>{vis().forEach(r=>SEL.delete(r.id));renderList()};
 $('#go').onclick=()=>{if(problems().length)return upd();show('game');start(1)};$('#bk').onclick=cancelGen;$('#lc').onclick=cancelGen;
 $('#nx').onclick=()=>start(+$('#nx').dataset.nr);
 $('#hb').onclick=()=>{if(!G||G.over||G.done)return;hm=hm?0:1;msg(hm?'ヒントON: 数字のマス・縛り(🧩の中)・残り爆弾数をタップ'+(run?'(1回につきヒント1回消費)':''):'');draw()};
 $('#st').onclick=e=>{if(hm&&e.target.closest('[data-k=c]'))ask('c')};
 $('#ml').addEventListener('click',e=>{if(MODE!='view'||!hm)return;const t=e.target.closest('.ri');if(t)ask('r',t.dataset.rid)});
 $('#fo').onclick=()=>{fm=0;$('#fo').classList.add('on');$('#ff').classList.remove('on')};
 $('#ff').onclick=()=>{fm=1;$('#ff').classList.add('on');$('#fo').classList.remove('on')};
 $('#g').onclick=e=>{const i=e.target.dataset.i;if(i===undefined)return;if(hm&&G&&G.st[+i]==1&&G.num[+i])return ask('n',+i);act(+i,fm)};
 $('#g').oncontextmenu=e=>{e.preventDefault();const i=e.target.dataset.i;if(i!==undefined)act(+i,1)};
 /* 検査レポート: 実行→表示、コピー、ダウンロード */
 $('#cg').onclick=()=>{const t=rep();$('#ctx').select();try{navigator.clipboard.writeText(t)}catch(e){}};
 $('#ct').onclick=async()=>{$('#ctx').value='検査中…(数十秒〜数分かかります)';await selfTest();rep()};
 $('#cd').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rep()],{type:'text/markdown'}));a.download='report.md';a.click()};
 rep()});
