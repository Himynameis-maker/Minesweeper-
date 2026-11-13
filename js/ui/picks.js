/* [ui/picks] 厳選盤面の一覧。タイトル(Minesweeper Plus)の横の「🎯 厳選盤面」ボタン(#pkb)で開く。
   ・サーバー(functions/api/picks.js)から最大21個を取る。作られた日(JST)ごとにまとめて、新しい日が上。1日に作られるのは最大3つ(サーバーが守る)。
   ・各行: 縛りの数(盤面コードの縛り欄から数える。サーバーの値は信じない) と、コードのコピーボタン(.cpb。押すと「copied」に変わる。copycode.js と同じ見た目)。
   ・コピーしたコードは、フリープレイの「盤面コード」欄に貼り付けて遊ぶ(freecode.js)。
   ・盤面コードのルールセット番号が今より古いもの(bcOld)は出さない(サーバーも、新しい版の盤面が入るときに消す)。
   ・一覧の一番上の「🛠 自分で作る・作ったものを見る」(#pmb)で、自分専用の盤面づくりのポップ(#pmm)が開く(下の「自分で作る」)。
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
/* L=コードを引く一覧(省略=サーバーの厳選。自分で作った一覧は PM.list を渡す) */
async function pkCopy(b,L){const p=(L||PKS.list)[+b.dataset.i];if(!p)return;
 const ok=await dyCopy(p.code);clearTimeout(b._t);b.textContent=ok?'copied':'failed';b.classList.toggle('ok',!!ok);
 b._t=setTimeout(()=>{b.textContent=tx('コード');b.classList.remove('ok')},PK_MS)}

/* ---- 自分で作る(#pmm)。縛りと盤面の大きさ(7〜12の正方形)を選び、この端末の中で厳選と同じ基準の盤面を1つ作る。
   ・作り方は tools/pick-plan.js の pickMake と同じ(gen に下限 minCost/minDeep/minDep と上限 maxCost を渡す)。違いは、縛り・大きさは自分で決める(抽選しない)ので引き直さず、PM_Q.sec 秒で見つからなければあきらめること。爆弾数は厳選と同じく自動(盤面の28〜45%から抽選。縛りに合わなければ近い数へ)。
   ・作っている間も、ポップを閉じても、ほかの画面で遊んでいても生成は続く(gen は非同期。キャンセルは PM.tk を進めるだけ)。生成中は #pkb / #pmb に点滅の丸、できたら緑の丸(ポップを開くと消える)。
   ・保存はこの端末の localStorage だけ(PM_KEY)。盤面コードだけを最大 PM_MAX 個。いっぱいのときは、捨てるまで新しく作れない(捨てるボタンは押し間違い防止で2度押し)。
   ・縛りの選択画面は、フリープレイと同じ #md(modal.js)を使い回す。開く間だけフリープレイの SEL を預けて、自分用の選択に入れ替え、閉じる(closeM→pmEndPick)で元に戻す。
   ・値は厳選と同じ。pick-plan.js の PICK(minCost/minDeep/minDep/tries) と daily-plan.js の DAILY(maxCost/bombMin/bombMax) を変えたら、PM_Q も同じ値にする。 */
const PM_KEY='msv.myPicks',PM_MAX=10;
const PM_Q={sec:60,tries:1500,maxCost:36,minCost:6,minDeep:4,minDep:.15,bombMin:.28,bombMax:.45};
const PM={list:[],sel:[],busy:0,tk:0,dn:0,del:-1,dt:0,msg:'',saved:null,picking:0};
function pmLoad(){let raw=null;try{raw=localStorage.getItem(PM_KEY)}catch(e){return} /* 読めないときは今の一覧を消さない */
 let a=[];try{a=JSON.parse(raw||'[]')}catch(e){}
 PM.list=(Array.isArray(a)?a:[]).filter(p=>p&&typeof p.code=='string'&&!bcOld(p.code)).slice(0,PM_MAX)}
function pmSave(){try{localStorage.setItem(PM_KEY,JSON.stringify(PM.list))}catch(e){}}
function pmSum(){const n=PM.sel.filter(id=>RULES[id]).map(id=>rname(RULES[id]));
 $('#pms').textContent=n.length?tx('{n}件: {l}',{n:n.length,l:n.join(' / ')}):tx('未選択(縛りなし)')}
function pmBtn(){for(const s of['#pkb','#pmb']){$(s).classList.toggle('busy',!!PM.busy);$(s).classList.toggle('dn',!PM.busy&&!!PM.dn)}}
function pmDraw(){let h='';
 if(PM.busy)h+='<div class="pkr pmband"><span class="pkn">'+tx('生成中')+'</span><button class="pmcx">'+tx('キャンセル')+'</button></div>';
 PM.list.forEach((p,i)=>{const sz=String(p.code).split('.')[2]||'',n=pkN(p.code),d=PM.del==i;
  h+='<div class="pkr"><span class="pkn">'+(/^\d+x\d+$/.test(sz)?sz.replace('x','×')+' ・ ':'')+(n?tx('縛り <b>{n}</b>',{n}):tx('縛りなし'))+'</span>'
   +'<button class="cpb" data-i="'+i+'">'+tx('コード')+'</button>'
   +'<button class="pmdl'+(d?' on':'')+'" data-i="'+i+'">'+tx(d?'本当に捨てる':'捨てる')+'</button></div>'});
 if(!PM.busy&&!PM.list.length)h+='<p class="mut">'+tx('まだありません。作るとここに出ます。')+'</p>';
 $('#pml').innerHTML=h;$('#pmw').textContent=PM.msg;$('#pmg').disabled=!!PM.busy;pmSum()}
/* 盤面の大きさ(7〜12)と縛りから cfg を作る。作れないときは理由({err}) */
function pmPlan(){const R=Math.max(7,Math.min(12,Math.round(+$('#pmS').value)||7)),C=R,N=R*C,max=N-12,ids=PM.sel.filter(id=>RULES[id]);
 const bad=[];
 for(const id of ids){let f=0;for(let m=1;m<=max&&!f;m++)if(mok(R,C,m,[id]))f=1;
  if(!f)bad.push(tx('「{n}」: {w}',{n:rname(RULES[id]),w:rwhy(RULES[id])||tx('今の盤面では使えません')}))}
 if(bad.length)return{err:bad.join(' / ')};
 let M=Math.max(1,Math.min(max,Math.round(N*(PM_Q.bombMin+rnd()*(PM_Q.bombMax-PM_Q.bombMin)))));
 if(!mok(R,C,M,ids)){const{lo,hi}=mnear(R,C,M,ids,max),o=[lo,hi].filter(Boolean);
  if(!o.length)return{err:tx('選んだ縛りに合う爆弾数がありません')};M=o[rnd()*o.length|0]}
 return{cfg:{R,C,M,ids}}}
async function pmStart(){if(PM.busy)return;PM.msg='';
 if(PM.list.length>=PM_MAX){PM.msg=tx('いっぱいです({n}個)。捨てるものを選んでね。',{n:PM_MAX});return pmDraw()}
 const p=pmPlan();if(p.err){PM.msg=p.err;return pmDraw()}
 const cfg=p.cfg,tk=++PM.tk;PM.busy=1;PM.dn=0;pmDraw();pmBtn();
 let res=null;
 try{res=await gen(cfg,{cancel:()=>tk!=PM.tk,qms:Infinity,hard:PM_Q.sec*1000,maxTries:PM_Q.tries,maxCost:PM_Q.maxCost,minCost:PM_Q.minCost,minDeep:PM_Q.minDeep,minDep:PM_Q.minDep})}
 catch(e){if(tk==PM.tk){PM.busy=0;PM.msg=tx('内部エラー: {m}',{m:e.message});pmDraw();pmBtn()}return}
 if(tk!=PM.tk)return; /* キャンセルされた */
 PM.busy=0;let code=null;
 if(res&&res.gf&&res.q)try{code=boardEncode(cfg,res)}catch(e){}
 if(code){PM.list.unshift({code,t:Date.now()});PM.list=PM.list.slice(0,PM_MAX);PM.del=-1;pmSave();PM.dn=1}
 else PM.msg=tx('見つかりませんでした。縛りや大きさを変えて、もう一度どうぞ。');
 pmDraw();pmBtn()}
function pmCancel(){PM.tk++;PM.busy=0;pmDraw();pmBtn()}
function pmOpen(){pmLoad();PM.msg='';PM.del=-1;PM.dn=0;$('#pmm').hidden=false;pmBtn();pmDraw()}
/* 縛りの選択画面を開く(#md を使い回す)。フリープレイの選択は預けておく */
function pmPickOpen(){PM.saved=[...SEL];SEL.clear();PM.sel.forEach(id=>{if(RULES[id])SEL.add(id)});PM.picking=1;openM('pick')}
/* closeM(modal.js)から呼ばれる。自分用の選択を受け取って、フリープレイの選択を戻したら true を返す(=closeM はあとの処理をしない) */
function pmEndPick(){if(!PM.picking)return false;
 PM.sel=[...SEL];SEL.clear();(PM.saved||[]).forEach(id=>SEL.add(id));PM.saved=null;PM.picking=0;PM.msg='';pmDraw();return true}
window.addEventListener('load',()=>{
 $('#pkb').onclick=pkOpen;
 $('#pkx').onclick=()=>$('#pkm').hidden=true;$('#pkm').onclick=e=>{if(e.target.id=='pkm')$('#pkm').hidden=true};
 $('#pkl').onclick=e=>{const b=e.target.closest&&e.target.closest('button[data-i]');if(b)return pkCopy(b)};
 /* 自分で作る */
 pmLoad();$('#pmr').innerHTML=pxi($('#pmr').innerHTML);
 $('#pmb').onclick=pmOpen;
 $('#pmx').onclick=()=>$('#pmm').hidden=true;$('#pmm').onclick=e=>{if(e.target.id=='pmm')$('#pmm').hidden=true};
 $('#pmr').onclick=pmPickOpen;$('#pmg').onclick=pmStart;
 $('#pmS').onchange=()=>{$('#pmS').value=Math.max(7,Math.min(12,Math.round(+$('#pmS').value)||7));PM.msg='';pmDraw()};
 $('#pml').onclick=e=>{const b=e.target.closest&&e.target.closest('button');if(!b)return;
  if(b.classList.contains('pmcx'))return pmCancel();
  if(b.classList.contains('pmdl')){const i=+b.dataset.i;clearTimeout(PM.dt);
   if(PM.del==i){PM.list.splice(i,1);PM.del=-1;PM.msg='';pmSave();return pmDraw()} /* 2度目の押しで捨てる */
   PM.del=i;PM.dt=setTimeout(()=>{PM.del=-1;pmDraw()},3000);return pmDraw()}
  if(b.classList.contains('cpb'))return pkCopy(b,PM.list)};
 pmDraw()});
