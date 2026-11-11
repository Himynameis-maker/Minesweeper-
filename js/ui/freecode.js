/* [ui/freecode] フリープレイの「盤面コード(貼り付け専用)」。デイリーの盤面コードを貼ると、その盤面をそのまま遊べる。
   貼ると設定が「キャンセル / スタート」だけになる(ほかの入力は薄くして触れなくするだけで、並びは動かさない=画面が急に変わらない)。
   ・ルールセット番号が古いコードは使えない(boardDecode が 'old' で断る)→「バージョンアップのため使えません」。
   ・キャンセルすると、貼る前の盤面サイズ・爆弾数・縛りに戻る。
   ・手で打ち込むことはできない(貼り付けだけ)。 */
let FC=null; /* 貼ったコードの盤面 {cfg,res,bak:{S,M,sel}}。null=使っていない */
const FC_ERR={format:tx('コードの形が違います。コピーしたコードをそのまま貼ってください。'),sum:tx('写し間違いがあるようです。もう一度コピーして貼ってください。'),
 old:tx('🔒 このコードはバージョンアップのため、使えません。'),size:tx('盤面の大きさを読み込めませんでした。'),board:tx('盤面を読み込めませんでした。'),rule:tx('知らない縛りが入っています(アプリが古い可能性)。')};
const fcMsg=(t,bad)=>{$('#bcm').textContent=t;$('#bcm').className='mut'+(bad?' ng':'')};
function fcLock(on){$('#setup').classList.toggle('fcl',on);
 for(const id of['S','M','pk','mf','mc','mdy'])$('#'+id).disabled=on;
 $('#BC').readOnly=on;$('#bcc').disabled=!on}
function fcApply(text){if(FC)return;const t=String(text||'').trim();if(!t){$('#BC').value='';return}
 const d=boardDecode(t);
 if(!d.ok){$('#BC').value='';return fcMsg(FC_ERR[d.err]+(d.id?'('+d.id+')':''),1)}
 FC={cfg:d.cfg,res:d.res,bak:{S:$('#S').value,M:$('#M').value,sel:[...SEL]}};
 $('#BC').value=t;$('#S').value=d.cfg.R;$('#M').value=d.cfg.M;SEL.clear();d.cfg.ids.forEach(id=>SEL.add(id));updSel();
 fcLock(true);fcMsg(tx('✅ {r}×{c}・爆弾{m}個・縛り{n}件の盤面です',{r:d.cfg.R,c:d.cfg.C,m:d.cfg.M,n:d.cfg.ids.length}));upd()}
function fcCancel(){if(!FC)return;const b=FC.bak;FC=null;
 $('#S').value=b.S;$('#M').value=b.M;SEL.clear();b.sel.forEach(id=>SEL.add(id));updSel();
 $('#BC').value='';fcLock(false);fcMsg('');upd()}
/* スタート: 生成せず、コードの盤面をそのまま置く */
function fcStart(){if(!FC)return;const{cfg,res}=FC;TK++;run=null;hm=0;G=null;
 $('#g').innerHTML='';$('#st').innerHTML='';$('#nx').hidden=true;$('#fin').hidden=true;$('#ld').hidden=true;$('#rg').hidden=true;
 $('#rv').textContent=tx('🧩 縛り ({n})',{n:cfg.ids.length});show('game');setBoard(cfg,res);msg(tx('盤面コードの盤面スタート'));draw()}
window.addEventListener('load',()=>{const b=$('#BC');
 b.addEventListener('paste',e=>{e.preventDefault();const cd=e.clipboardData||window.clipboardData;fcApply(cd?cd.getData('text'):'')});
 /* 打ち込みは止める。貼り付け・ドロップ・一度に2文字以上入る入力(キーボードの貼り付け候補など)だけ通す */
 b.addEventListener('beforeinput',e=>{const t=e.inputType||'';
  if(t.startsWith('delete')||t.startsWith('insertFromPaste')||t=='insertFromDrop'||t=='insertReplacementText')return;
  if(t=='insertText'&&(e.data||'').length>1)return;
  e.preventDefault()});
 b.addEventListener('input',()=>{if(!FC)fcApply(b.value)});
 $('#bcc').onclick=fcCancel});
