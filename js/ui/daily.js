/* [ui/daily] デイリーモードの画面。サーバー(functions/api/daily/*)とのやりとり・3,2,1 のカウント・タイマー・結果・ランキング・盤面入手。
   盤面そのものは core/boardcode.js の boardDecode → play.js の setBoard で作る(ルールを足してもここは触らない)。
   DYS.rules=今日の縛りの id の一覧(status が返す。盤面の中身は含まない)。スタート前に「🧩 今日の縛り」ボタン(#dyu)で見せる。null=まだ/見せない(準備中・更新中・エラー)。
   状態: DYS.state = ''(読み込み中) / new(まだ) / prep(今日の盤面が無い) / maint(更新中=メンテナンスで今日は遊べない) / done(終わった) / err(通信できない)。
   maint のときもランキング・盤面入手(遊び終えた端末)は普通に使える。管理者が解除すると、60秒以内(pollMs)に自動でスタートに戻る。
   途中で離れて戻ってきた(サーバー上 playing)場合は、ミス扱いで終わらせて done にする(1日1回の約束)。
   デイリーの盤面を遊んでいる間は DY=1(state.js)。ミス・クリアは play.js の act() の最後が dyEnd() を呼ぶ。 */
const DAILY_UI={
 cdMs:3000,          // 3,2,1 の長さ。functions/_lib.js の CD_MS と同じ値にすること(サーバーは「開始〜終了」からこれを引いてタイムにする)
 endDelayMs:1100,    // クリア/ミスの盤面を見せてから結果カードを出すまでの時間
 pollMs:60000,       // 「準備中」「更新中」「エラー」のとき、何ミリ秒ごとに確かめ直すか(タブが見えていないときは確かめない。見える状態に戻ったときに取り直す)
 tokenKey:'msv.dailyToken',nameKey:'msv.dailyName',streakKey:'msv.dailyStreak',nameMax:12
};
const DYS={state:'',day:'',ver:null,tok:'',name:'',busy:0,fin:0,clear:false,t0:0,res:null,sent:'',err:0,forfeit:0,tick:0,clock:0,poll:0,last:0,rk:null,rkSel:0,rules:null};
const dySleep=ms=>new Promise(r=>setTimeout(r,ms));
const dyEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* 時間表示 m:ss.t(dec=1)/ m:ss.tt(dec=2) */
const dyFmt=(ms,dec)=>{dec=dec||1;const k=dec==2?10:100,t=Math.floor(Math.max(0,ms)/k),per=dec==2?100:10,m=Math.floor(t/(60*per)),s=(t%(60*per))/per;return m+':'+s.toFixed(dec).padStart(dec+3,'0')};
/* 端末の合言葉(token)。ブラウザに保存。消すと同じ日にもう一度遊べてしまうが、アカウントなしの方針なので許容 */
function dyTok(){if(DYS.tok)return DYS.tok;let t='';try{t=localStorage.getItem(DAILY_UI.tokenKey)||''}catch(e){}
 if(!/^[A-Za-z0-9_-]{16,64}$/.test(t)){const a=new Uint8Array(24);
  if(typeof crypto!='undefined'&&crypto.getRandomValues)crypto.getRandomValues(a);else for(let i=0;i<24;i++)a[i]=Math.random()*256|0;
  t=bcB64(a);try{localStorage.setItem(DAILY_UI.tokenKey,t)}catch(e){}}
 return DYS.tok=t}
/* 連続クリア日数(この端末だけの記録。ブラウザに保存。消す・別の端末だと数えられない)。
   クリアした日が1日ずつ続いている間だけ増える。ミス・途中で離れた(ミス扱い)ら 0。遊ばない日があると途切れる(最後にクリアした日が昨日より前なら 0 と表示)。
   記録は {last:最後に結果が出た日, n:その日までの連続日数}。同じ日を2回数えない。 */
const dyJst=ms=>new Date(ms+9*36e5).toISOString().slice(0,10);
const dyPrev=d=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()-1);return t.toISOString().slice(0,10)};
function dyStreakGet(){let s=null;try{s=JSON.parse(localStorage.getItem(DAILY_UI.streakKey)||'null')}catch(e){}
 return s&&/^\d{4}-\d{2}-\d{2}$/.test(s.last)&&Number.isInteger(s.n)&&s.n>=0?s:{last:'',n:0}}
const dyStreakNow=()=>{const s=dyStreakGet(),t=dyJst(Date.now());return s.last==t||s.last==dyPrev(t)?s.n:0}; /* 表示する日数: 今日か昨日までつながっていなければ 0 */
function dyStreakSet(day,win){const s=dyStreakGet();if(s.last>=day)return; /* 同じ日の2回目(もう一度送る)や、古い日は無視 */
 const n=win?(s.last==dyPrev(day)?s.n:0)+1:0;try{localStorage.setItem(DAILY_UI.streakKey,JSON.stringify({last:day,n}))}catch(e){}}
/* ニックネーム。サーバー(functions/_lib.js の cleanName)と同じ掃除をして、空になる名前は弾く */
const dyClean=n=>Array.from(String(n||'').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>]/g,'').trim()).slice(0,DAILY_UI.nameMax).join('').trim();
const dyName=()=>dyClean($('#dyn').value);
async function dyApi(path,body){const ac=typeof AbortController!='undefined'?new AbortController():null,to=setTimeout(()=>ac&&ac.abort(),10000);
 try{const o={cache:'no-store'};if(ac)o.signal=ac.signal;if(body){o.method='POST';o.headers={'content-type':'application/json'};o.body=JSON.stringify(body)}
  const r=await fetch(path,o);let j=null;try{j=await r.json()}catch(e){}return{ok:r.ok,status:r.status,j:j||{}}}
 catch(e){return{ok:false,status:0,j:{}}}finally{clearTimeout(to)}}
const dyCopy=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(e){}
 try{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return!!ok}catch(e){return false}};

/* ---- 設定画面のデイリーカード ---- */
function dyOpen(){try{const n=localStorage.getItem(DAILY_UI.nameKey);if(n&&!$('#dyn').value)$('#dyn').value=n}catch(e){}
 dyClose();dyRender();dyClockTick();DYS.clock=setInterval(dyClockTick,1000);dyRefresh()}
function dyClose(){clearInterval(DYS.clock);clearTimeout(DYS.poll)}
function dyClockTick(){const left=864e5-((Date.now()+9*36e5)%864e5),s=Math.floor(left/1000),p=n=>String(n).padStart(2,'0');
 $('#dyx').textContent='⏰ 次の盤面まで '+p(s/3600|0)+':'+p(s%3600/60|0)+':'+p(s%60);
 if(left>86396e3&&DYS.state!=''&&!document.hidden&&Date.now()-DYS.last>5000)dyRefresh()} /* 0:00 を過ぎた直後は状態を取り直す(見えていないタブは、見えるようになったときに取り直す) */
async function dyRefresh(){if(DYS.busy||mode()!='d')return;clearTimeout(DYS.poll);DYS.last=Date.now();
 const r=await dyApi('/api/daily/status?token='+dyTok());if(DYS.busy)return;
 DYS.rules=null;
 if(!r.ok||!r.j.state){DYS.state='err';DYS.err=r.ok?404:r.status} /* 200 なのに JSON でない=index.html が返っている=サーバー機能(functions/)が公開されていない。404 と同じ案内にする */
 else{DYS.day=r.j.day;DYS.ver=r.j.ver==null?null:+r.j.ver; /* null=サーバーが番号を返さない(古い status.js)→ 判定しない */DYS.state=r.j.state;
  if(DYS.state=='new'&&DYS.ver!=null&&DYS.ver<BOARD_VER)DYS.state='prep'; /* ルール更新後で、盤面がまだ古い番号のまま(作り直し待ち) */
  if(Array.isArray(r.j.rules)&&(DYS.state=='new'||DYS.state=='playing'||DYS.state=='done'))DYS.rules=r.j.rules; /* 古い番号の盤面(prep)や更新中は見せない */
  if(DYS.state=='playing'){ /* 途中で離れた=ミス扱いで終了 */
   const f=await dyApi('/api/daily/finish',{token:dyTok(),day:DYS.day,clear:false});
   DYS.state=f.ok||f.status==409?'done':'err';DYS.err=f.status;DYS.forfeit=DYS.state=='done';if(DYS.forfeit)dyStreakSet(DYS.day,0)}}
 dyRender();if(DYS.state=='prep'||DYS.state=='maint'||DYS.state=='err')DYS.poll=setTimeout(dyPoll,DAILY_UI.pollMs)}
/* 定期の確かめ直し。タブが見えていないなら通信せず、ここで止める(見えるようになったら visibilitychange が取り直して、また続く) */
function dyPoll(){if(document.hidden)return;dyRefresh()}
function dyRender(){const s=DYS.state,g=$('#dyg'),done=s=='done',nameOk=!!dyName();
 {const w=$('#dyw'),n=dyStreakNow();w.textContent='🔥 '+n+'日連続';w.classList.toggle('on',n>0)} /* 見出しの横の連続クリア日数 */
 $('#dyu').hidden=!(DYS.rules&&(s=='new'||s=='done')); /* 今日の縛りボタン: 縛りが分かっているときだけ出す(クリア後も見られる) */
 $('#dyl').hidden=done||s=='maint';$('#dyg').hidden=done;$('#dyk').hidden=!done;
 g.disabled=s==''||(s=='new'&&!nameOk);
 g.textContent=s==''?'読み込み中…':s=='new'?'スタート':s=='prep'?'⏳ 準備中(タップで更新)':s=='maint'?'🛠 更新中(タップで更新)':'🔄 再読み込み';
 let t='';
 if(s=='new')t=nameOk?'準備OK! 押すと 3・2・1 のあとすぐ始まるよ(今日の1回を使います)':'ニックネームを入れてね';
 else if(s=='prep')t=DYS.ver!=null&&DYS.ver<BOARD_VER?'ルールの更新で、今日の盤面を作り直し中です。少し待ってね。':'今日の盤面はまだ準備中です。少し待ってね。';
 else if(s=='maint')t='🛠 更新中のため遊べません'; /* ランキング・盤面入手は今までどおり使える */
 else if(s=='done')t=(DYS.forfeit?'前回は途中で終わったので、今日の挑戦は終了です。':'今日の挑戦は終わったよ。')+'また明日!(盤面入手で今日の盤面コードをコピーできます)';
 else if(s=='err')t=DYS.err==0?'サーバーにつながりません。通信を確かめてね。':DYS.err==404?'デイリーのサーバー機能が見つかりません(公開サイトで開いていますか?)':'うまく読み込めませんでした(エラー '+DYS.err+')';
 $('#dys').textContent=t}
async function dyGo(){const s=DYS.state;
 if(s=='prep'||s=='maint'||s=='err'){DYS.state='';dyRender();return dyRefresh()}
 if(s=='new')return dyStart()}
async function dyCode(){const b=$('#dyk');if(b.disabled)return;b.disabled=true;
 const r=await dyApi('/api/daily/code?token='+dyTok());
 b.textContent=r.ok&&r.j.code?(bcOld(r.j.code)?'🔒 バージョンアップのため使えません':await dyCopy(r.j.code)?'✅ コピーしました':'コピーできませんでした'):'取得できませんでした';
 setTimeout(()=>{b.textContent='📋 盤面入手';b.disabled=false},2200)}

/* ---- 開始 → 3,2,1 → プレイ ---- */
async function dyStart(){if(DYS.busy||DYS.state!='new')return;const name=dyName();if(!name)return dyRender();
 try{localStorage.setItem(DAILY_UI.nameKey,name)}catch(e){}
 DYS.busy=1;$('#dyg').disabled=true;$('#dys').textContent='盤面を受け取っています…';
 const r=await dyApi('/api/daily/start',{token:dyTok()});
 const back=m=>{DYS.busy=0;dyRender();if(m)$('#dys').textContent=m};
 if(!r.ok){
  if(r.status==409){DYS.state='playing';back();return dyRefresh()} /* すでに始めていた */
  if(r.status==503){DYS.state='prep';back();return dyRefresh()}
  if(r.status==423){DYS.state='maint';back();return dyRefresh()} /* 画面を開いたあとに更新が始まった */
  return back(r.status==0?'サーバーにつながりませんでした。もう一度押してね。':'うまく始められませんでした(エラー '+r.status+')。少し待ってもう一度。')}
 const d=boardDecode(r.j.code);
 if(!d.ok)return back('盤面を読み込めませんでした('+d.err+(d.id?':'+d.id:'')+')。少し待ってからもう一度。続けて失敗する場合は作者に連絡してね。');
 DYS.day=r.j.day;DYS.name=name;DYS.fin=0;DYS.res=null;DYS.sent='';
 TK++;run=null;hm=0;fm=0;['#fo','#ff','#fk'].forEach((x,k)=>$(x).classList.toggle('on',k==0));
 setBoard(d.cfg,d.res);DY=1;
 $('#ld').hidden=true;$('#fin').hidden=true;$('#rg').hidden=true;$('#hb').hidden=true;$('#bk').hidden=true;$('#dyt').hidden=false;$('#dyt').textContent=dyFmt(0);
 msg('');draw();$('#g').style.visibility='hidden'; /* カウント中は盤面を見せない */
 show('game');await dyCount();
 $('#g').style.visibility='';DYS.t0=performance.now();msg('');
 DYS.tick=setInterval(()=>{if(!DYS.fin)$('#dyt').textContent=dyFmt(performance.now()-DYS.t0)},100)}
/* 3,2,1(ちょうど cdMs)。0 になったら即 GO! を重ねて盤面を触れるようにする */
function dyCount(){return new Promise(res=>{const o=$('#cdn'),n=$('#cdnn'),t0=performance.now(),per=DAILY_UI.cdMs/3;let k=0;
 o.className='';o.hidden=false;
 const step=()=>{const left=3-k;
  if(left<=0){n.textContent='GO!';n.className='pop go';n.dataset.n='0';o.className='go';setTimeout(()=>{o.hidden=true;o.className=''},650);return res()}
  n.textContent=String(left);n.dataset.n=String(left);n.className='';void n.offsetWidth;n.className='pop'; /* アニメを毎回やり直す */
  k++;setTimeout(step,Math.max(0,t0+k*per-performance.now()))};
 step()})}

/* ---- 終了(ミスかクリア): すぐサーバーへ送り、盤面を少し見せてから結果カード ---- */
async function dyEnd(){if(!DY||DYS.fin)return;DYS.fin=1;clearInterval(DYS.tick);
 DYS.clear=!!G.done&&!G.over;DYS.local=performance.now()-DYS.t0;
 $('#dyt').textContent=dyFmt(DYS.local,2);msg(DYS.clear?'🎉 クリア!':'💥 ミス! 今日の挑戦は終了です');
 await Promise.all([dySend(),dySleep(DAILY_UI.endDelayMs)]);if(DY&&DYS.fin)dyShow()}
async function dySend(){DYS.sent='sending';let net=0;
 for(let i=0;i<3;i++){const r=await dyApi('/api/daily/finish',{token:dyTok(),day:DYS.day,clear:DYS.clear,name:DYS.name});
  if(r.ok&&r.j.ok){DYS.res=r.j;DYS.sent='ok';return}
  if(r.status==409)return void(DYS.sent=net?'unk':'rej'); /* 通信エラーのあとの409=1回目が届いていた可能性 */
  if(r.status>=400&&r.status<500){DYS.sent='rej';DYS.err=r.j.err||r.status;return}
  net=1;await dySleep(1200)}
 DYS.sent='fail'}
function dyShow(){const win=DYS.clear,sent=DYS.sent,r=DYS.res,ms=r?r.ms:DYS.local,bad=win&&sent=='fail'; /* bad=クリアしたのに結果を送れていない */
 if(win){if(sent=='ok')dyStreakSet(DYS.day,1)}else dyStreakSet(DYS.day,0); /* 連続クリア日数: クリアが登録できたら+1、ミスなら0 */
 let ic,tt,ds;
 if(bad){ic='📡';tt='通信エラー';ds='結果を送れませんでした。電波のいい場所で「もう一度送る」を押してね。このまま戻ると、今日の記録は残りません。'}
 else if(!win){ic='💥';tt='ミス…';ds='今日の挑戦は終了です。また明日!(盤面入手で今日の盤面コードをコピーできます)'}
 else if(sent=='ok'){ic='🏆';tt='クリア!';ds=r.rank?r.rank+'位にランクイン! 今のランキングは設定画面の「ランキング」で見られるよ。':'クリア! 惜しくもランキング圏外(上位20位まで)でした。'}
 else{ic='🏆';tt='クリア!';ds=sent=='unk'?'結果が届いたか確認できませんでした。ランキングで確かめてね。':'今日の記録は登録できませんでした('+DYS.err+')。'}
 $('#fin').className=win&&!bad?'win':'lose';$('#fini').textContent=ic;$('#fint').textContent=tt;$('#find').textContent=ds;
 $('#fins').innerHTML='<span class="chip">⏱ <b>'+dyFmt(ms,2)+'</b></span>'+(win&&sent=='ok'&&r&&r.rank?'<span class="chip">🏅 '+r.rank+'位</span>':'');
 $('#finr').hidden=!bad;$('#finr').textContent='📡 もう一度送る';$('#finb').textContent='デイリーに戻る';cpFin(0);
 chFx(win&&!bad);$('#fin').hidden=false}
async function dyRetry(){if(DYS.sent=='sending')return;$('#finr').disabled=true;$('#finr').textContent='送信中…';await dySend();$('#finr').disabled=false;dyShow()}
function dyLeave(){$('#fin').hidden=true;clearInterval(DYS.tick);DY=0;DYS.busy=0;G=null;$('#g').innerHTML='';$('#g').style.visibility='';$('#st').innerHTML='';
 $('#hb').hidden=$('#bk').hidden=false;$('#dyt').hidden=true;$('#finr').hidden=false;$('#finr').textContent='もう一度挑戦';$('#finb').textContent='タイトルへ';
 DYS.state='';show('setup');dyRender();dyRefresh()}

/* ---- ランキング(今日〜6日前)。今日の分は順位だけで、盤面コードは出さない(明日から)。盤面コードは順位の一覧の上(#rkc)に「コピー」ボタンで置く。押すとボタンの文字が1.5秒だけ変わる ---- */
const RK_CP='📋 盤面コードをコピー';
async function dyRank(){$('#rk').hidden=false;$('#rkt').innerHTML='';$('#rkc').innerHTML='';$('#rkl').innerHTML='<p class="mut">読み込み中…</p>';
 const r=await dyApi('/api/daily/ranking');
 if(!r.ok||!r.j.days){$('#rkl').innerHTML='<p class="mut">読み込めませんでした。あとでもう一度開いてね。</p>';return}
 DYS.rk=r.j.days;DYS.rkSel=0;dyRankDraw()}
function dyRankDraw(){const ds=DYS.rk||[],d=ds[DYS.rkSel];if(!d)return;
 $('#rkt').innerHTML=ds.map((x,i)=>'<button data-n="'+i+'"'+(i==DYS.rkSel?' class="on"':'')+'>'+(x.today?'今日':x.day.slice(5).replace('-','/'))+'</button>').join('');
 $('#rkc').innerHTML=d.today?'<div class="rkcn">🔒 今日の盤面コードは、明日から見られます</div>' /* 今日の分: コードは出さない */
  :d.code?(bcOld(d.code)?'<div class="rkcn">🔒 バージョンアップのため、この盤面は利用できません</div>' /* 古い番号: コードは出さない=コピーできない */
  :'<button class="rkcp" data-c="1">'+RK_CP+'</button>'):'';
 $('#rkl').innerHTML=(d.ranks.length?d.ranks.map((x,i)=>'<div class="rkr"><span class="rkn">'+(i+1)+'</span><span class="rkm">'+dyEsc(x.name)+'</span><b>'+dyFmt(x.ms,2)+'</b></div>').join(''):'<p class="mut">'+(d.today?'まだクリア記録はありません':d.code?'この日のクリア記録はありません':'この日の盤面はありません')+'</p>')}

window.addEventListener('load',()=>{
 $('#dyg').onclick=dyGo;$('#dyk').onclick=dyCode;$('#dyr').onclick=dyRank;$('#dyu').onclick=()=>{if(DYS.rules)openM('dy')};
 $('#dyn').oninput=()=>{if(DYS.state=='new')dyRender()};
 $('#rkx').onclick=()=>$('#rk').hidden=true;$('#rk').onclick=e=>{if(e.target.id=='rk')$('#rk').hidden=true};
 $('#rkt').onclick=e=>{const b=e.target.closest&&e.target.closest('button');if(b){DYS.rkSel=+b.dataset.n;dyRankDraw()}};
 $('#rkc').onclick=async e=>{const b=e.target.closest&&e.target.closest('button[data-c]');if(!b)return;const d=(DYS.rk||[])[DYS.rkSel];if(!d||d.today||!d.code||bcOld(d.code))return;
  const ok=await dyCopy(d.code);clearTimeout(b._t);b.textContent=ok?'✅ コピーしました':'コピーできませんでした';b._t=setTimeout(()=>{b.textContent=RK_CP},1500)}; /* 横幅いっぱいのボタンなので、文字が変わっても画面は動かない */
 /* アプリに戻ってきたとき(別アプリ・別タブから)。遊んでいる最中は触らない */
 const back=()=>{if(mode()=='d'&&!DYS.busy&&!$('#setup').hidden&&Date.now()-DYS.last>5000)dyRefresh()};
 window.addEventListener('focus',back);window.addEventListener('pageshow',back);
 window.addEventListener('visibilitychange',()=>{if(!document.hidden)back()}) /* タブが見えるようになったとき(visibilitychange は window まで届く) */});
