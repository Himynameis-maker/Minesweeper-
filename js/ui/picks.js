/* [ui/picks] 厳選盤面の一覧。タイトル(Minesweeper Plus)の横の「🎯 厳選盤面」ボタン(#pkb)で開く。
   ・サーバー(functions/api/picks.js)から最大21個を取る。作られた日(JST)ごとにまとめて、新しい日が上。1日に作られるのは最大3つ(サーバーが守る)。
   ・各行: 縛りの数(盤面コードの縛り欄から数える。サーバーの値は信じない) と、コードのコピーボタン(.cpb。押すと「copied」に変わる。copycode.js と同じ見た目)。
   ・コピーしたコードは、フリープレイの「盤面コード」欄に貼り付けて遊ぶ(freecode.js)。
   ・盤面コードのルールセット番号が今より古いもの(bcOld)は出さない(サーバーも、新しい版の盤面が入るときに消す)。
   daily.js の dyApi / dyCopy / dyEsc / dyJst と、boardcode.js の bcOld を使うので、daily.js のあとに読み込む。 */
const PK_MS=1200;
const PKS={list:[]};
/* 盤面コード MS1.<ver>.<R>x<C>.<start>.<縛りid(,区切り)>… から縛りの数 */
const pkN=code=>{const f=String(code||'').split('.');return f[4]?f[4].split(',').length:0};
const pkDayOk=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''));
function pkDraw(){const L=PKS.list,today=dyJst(Date.now());
 if(!L.length){$('#pkl').innerHTML='<p class="mut">'+tx('まだありません。できたらここに出ます。')+'</p>';return}
 let h='',cur='';
 L.forEach((p,i)=>{if(p.day!=cur){cur=p.day;const k=L.filter(x=>x.day==cur).length;
   h+='<div class="pkh">'+(cur==today?tx('今日')+' ':'')+(+cur.slice(5,7))+'/'+(+cur.slice(8,10))+'<span class="mut"> '+tx('・{k}つ',{k})+'</span></div>'}
  const n=pkN(p.code);
  h+='<div class="pkr"><span class="pkn">'+(n?tx('縛り <b>{n}</b>',{n}):tx('縛りなし'))+'</span><button class="cpb" data-i="'+i+'">'+tx('コード')+'</button></div>'});
 $('#pkl').innerHTML=h}
async function pkOpen(){$('#pkm').hidden=false;$('#pkl').innerHTML='<p class="mut">'+tx('読み込み中…')+'</p>';
 const r=await dyApi('/api/picks');
 if(!r.ok||!Array.isArray(r.j.picks)){$('#pkl').innerHTML='<p class="mut">'+tx('読み込めませんでした。あとでもう一度開いてね。')+'</p>';return}
 PKS.list=r.j.picks.filter(p=>p&&typeof p.code=='string'&&pkDayOk(p.day)&&!bcOld(p.code)).slice(0,21);pkDraw()}
async function pkCopy(b){const p=PKS.list[+b.dataset.i];if(!p)return;
 const ok=await dyCopy(p.code);clearTimeout(b._t);b.textContent=ok?'copied':'failed';b.classList.toggle('ok',!!ok);
 b._t=setTimeout(()=>{b.textContent=tx('コード');b.classList.remove('ok')},PK_MS)}
window.addEventListener('load',()=>{
 $('#pkb').onclick=pkOpen;
 $('#pkx').onclick=()=>$('#pkm').hidden=true;$('#pkm').onclick=e=>{if(e.target.id=='pkm')$('#pkm').hidden=true};
 $('#pkl').onclick=e=>{const b=e.target.closest&&e.target.closest('button[data-i]');if(b)return pkCopy(b)}});
