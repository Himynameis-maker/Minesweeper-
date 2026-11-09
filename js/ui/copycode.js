/* [ui/copycode] フリープレイ・チャレンジの「盤面コード」コピー。ボタンが2つ(枠と色つきで目立たせてある。style.css の .cpb): 盤面画面の上(#cp)と、チャレンジの終了カード(#fincp)。
   ・コードは play.js の setBoard が G.code に入れる(boardEncode。貼り付けるとフリープレイでその盤面を遊べる)。
   ・ミスで終わった盤面でも、チャレンジのゲームオーバー/達成の演出が出たあとでも、最後の盤面のコードをコピーできる。
   ・デイリー(DY)は「今日の盤面は終わるまで出さない」約束なので、ボタンを出さない・コピーもしない(終わったあとの「盤面入手」を使う)。
   ・押すと文字が「copied」に変わり、色が反転する(1.2秒)。ボタンの幅は固定(style.css の .cpb)なので、画面は動かない。
   ・dyCopy(ui/daily.js)を使うので、daily.js より後に読み込む。 */
const CP_MS=1200;
/* 盤面画面の上のボタン: デイリー中は消す(場所も取らない=デイリーの並びは今まで通り)。コードがまだ無い間(生成中)は見えなくするだけ(場所は残る) */
function cpUpd(){const b=$('#cp');b.hidden=!!DY;b.style.visibility=G&&G.code?'':'hidden'}
/* チャレンジ終了カードのボタン: on=1 で出す(コードがあるときだけ)。デイリーの結果カードは cpFin(0) */
function cpFin(on){$('#fincpw').hidden=!(on&&G&&G.code&&!DY)}
async function cpCopy(b){if(!G||!G.code||DY)return;const ok=await dyCopy(G.code);
 clearTimeout(b._t);b.textContent=ok?'copied':'failed';b.classList.toggle('ok',!!ok);b._t=setTimeout(()=>{b.textContent=b.dataset.t;b.classList.remove('ok')},CP_MS)}
window.addEventListener('load',()=>{for(const id of['cp','fincp']){const b=$('#'+id);b.dataset.t=b.textContent;b.onclick=()=>cpCopy(b)}});
