/* [game/state] グローバル状態とDOMヘルパー。他の game/ui ファイルがすべて使う。 */
const $=s=>document.querySelector(s);
/* G=今の盤面, run=チャレンジ進行(フリープレイは null), fm=旗モード, hm=ヒントON, LAST=直前の縛り組, MODE=モーダル種別('pick'|'view'), TK=生成トークン(キャンセル用), AGE=縛りの未使用ターン数, SEL=選択中の縛りid */
let G=null,run=null,fm=0,hm=0,LAST='',MODE='',TK=0;const AGE={},SEL=new Set();
const v=id=>+$('#'+id).value,chk=id=>$('#'+id).checked,mode=()=>$('#mc').classList.contains('on')?'c':'f';
const msg=t=>$('#msg').textContent=t;
const show=id=>{$('#setup').hidden=id!='setup';$('#game').hidden=id!='game';scrollTo(0,0)};
