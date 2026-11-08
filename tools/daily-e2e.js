/* デイリーの通しテスト(ブラウザ・Cloudflare 不要)。使い方: node tools/daily-e2e.js
   ・functions/ の本物のファイルを、SQLite(node:sqlite)で作った D1 もどきの上で動かす
   ・画面側は js/ui/daily.js を偽DOMで動かし、fetch を functions に直結する
   ・ファイル名がURLになる(Pages Functions の決まり)ことも検査する: functions/ 配下に「空白を含む名前」「.js 以外」があれば失敗
   見るのは: ルート名 / 状態遷移(prep→new→done) / 1日1回 / 3,2,1の長さ / クリア→ランキング / ミス / 途中離脱=ミス扱い / 盤面入手 / 古い番号の盤面は準備中扱い
   / メンテナンス(予約→更新中=遊べない・盤面を受け付けない→解除。ランキング・盤面入手は止まらない) */
const fs=require('fs'),path=require('path'),vm=require('vm'),{pathToFileURL}=require('url');
const root=path.join(__dirname,'..');
let DatabaseSync;try{({DatabaseSync}=require('node:sqlite'))}catch(e){console.log('node:sqlite が使えないので省略(Node 22.5 以上が必要)');process.exit(0)}
const ok=(c,m)=>{if(!c){console.error('FAIL: '+m);process.exit(1)}console.log('ok: '+m)};
(async()=>{
/* ---- 1. ルート名の検査 ---- */
const routes={};const walk=(d,pre)=>{for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory())walk(p,pre+f.name+'/');else{if(/\s/.test(f.name)||!f.name.endsWith('.js'))ok(false,'functions のファイル名が不正: "'+pre+f.name+'"');routes['/'+pre+f.name.replace(/\.js$/,'')]=p}}};
walk(path.join(root,'functions'),'');
for(const r of['/api/daily/status','/api/daily/start','/api/daily/finish','/api/daily/code','/api/daily/ranking','/api/admin/board','/api/admin/maint','/ping'])ok(routes[r],'ルートがある '+r);
/* ---- 2. D1 もどき ---- */
const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(path.join(root,'schema.sql'),'utf8'));
const stmt=q=>{let a=[];const o={bind:(...x)=>{a=x;return o},
 first:async()=>sql.prepare(q).get(...a)||null,all:async()=>({results:sql.prepare(q).all(...a)}),
 run:async()=>{const r=sql.prepare(q).run(...a);return{meta:{changes:Number(r.changes)}}},_run:()=>sql.prepare(q).run(...a)};return o};
const DB={prepare:stmt,batch:async l=>{sql.exec('BEGIN');try{l.forEach(s=>s._run());sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB,DAILY_TOKEN:'test-admin-token-1234'},mods={};
const call=async(url,opt={})=>{const u=new URL(url,'https://x.test'),f=routes[u.pathname];if(!f)return new Response('nf',{status:404});
 mods[f]=mods[f]||await import(pathToFileURL(f).href+'?'+Date.now());
 const m=opt.method||'GET',h=m=='GET'?mods[f].onRequestGet:m=='POST'?mods[f].onRequestPost:m=='DELETE'?mods[f].onRequestDelete:mods[f].onRequestPut;
 if(!h)return new Response('{}',{status:405});return h({request:new Request(u,opt),env,waitUntil(){}})};
/* ---- 3. 画面(偽DOM)を読み込む ---- */
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
ok(srcs.includes('js/ui/daily.js'),'index.html が daily.js を読んでいる');
for(const id of['mdy','dyc','dyn','dyg','dyk','dyr','dys','dyx','dyl','dyt','cdn','cdnn','rk','rkt','rkl','rkx'])ok(html.includes('id="'+id+'"'),'index.html に #'+id);
const code=srcs.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const els={},loads=[],LS={};
function El(id){this.id=id;this.value='';this.hidden=false;this.innerHTML='';this.textContent='';this.className='';this.dataset={};this.disabled=false;this.style={setProperty(){}};
 const on=new Set(id=='mf'||id=='fo'?['on']:[]);this.classList={toggle:(c,f)=>{(f===undefined?!on.has(c):f)?on.add(c):on.delete(c)},add:c=>on.add(c),remove:c=>on.delete(c),contains:c=>on.has(c)};
 this.addEventListener=()=>{};this.select=()=>{};this.closest=()=>null}
const document={querySelector:s=>els[s]||(els[s]=new El(s.replace(/^#/,''))),createElement:()=>new El('a')};
const window={addEventListener:(t,f)=>t=='load'&&loads.push(f)};
const fetch=async(url,o={})=>{const r=await call(url,o);return r};
const ctx=vm.createContext({localStorage:{getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v)}},document,window,performance,setTimeout,clearTimeout,setInterval,clearInterval,console,Date,Uint8Array,Int8Array,Int32Array,
 innerWidth:400,scrollTo(){},navigator:{clipboard:{writeText:async t=>{ctx.__clip=t}}},fetch,AbortController,crypto:require('crypto').webcrypto,loads});
const run=s=>vm.runInContext(s,ctx),$=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
vm.runInContext(code,ctx);loads.forEach(f=>f());
ok(run('RULE_ERR.length')==0,'ルール登録エラーなし');
/* ---- 4. 今日の盤面を登録(手作りの6x6。縛りなし) ---- */
const today=run("new Date(Date.now()+9*36e5).toISOString().slice(0,10)");
const mk=()=>run(`(()=>{const mines=new Uint8Array(36);[1,8,14,20,27,33].forEach(i=>mines[i]=1);return boardEncode({R:6,C:6,M:6,ids:[]},{mines,start:35})})()`);
const CODE=mk(),adm={authorization:'Bearer '+env.DAILY_TOKEN,'content-type':'application/json'};
ok(run('boardDecode')(CODE).ok,'盤面コードの往復');
let r=await call('/api/daily/status?token=abcdefghijklmnop');let j=await r.json();ok(r.status==200&&j.state=='prep','盤面が無い間は prep');
r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:today,code:CODE})});ok(r.status==200,'管理APIで登録');
r=await call('/api/admin/board?day='+today,{headers:adm});ok(r.status==200,'管理API: ある → 200');
r=await call('/api/admin/board?day=2000-01-01',{headers:adm});j=await r.json();ok(r.status==404&&j.exists===false,'管理API: 無い → 404 と {exists:false}');
r=await call('/ping');j=await r.json();ok(r.status==200&&j.ok&&j.binding&&j.tables&&j.token,'/ping: binding・tables・token がそろっている');
r=await call('/api/admin/board?day='+today);ok(r.status==401,'管理API: トークンなし → 401');
/* ---- 5. 画面: デイリーを開く ---- */
$('#mdy').onclick();await sleep(100);
ok(run("mode()")=='d'&&!$('#dyc').hidden&&$('#go').hidden,'デイリーに切り替わる');
ok($('#dyg').textContent=='スタート'&&$('#dyg').disabled,'名前が空だとスタートは押せない');
$('#dyn').value='  テスト<太郎>  ';$('#dyn').oninput();ok(!$('#dyg').disabled,'名前を入れると押せる');
const t0=Date.now();$('#dyg').onclick();
await sleep(300);ok($('#cdn').hidden==false&&['3','2','1'].includes($('#cdnn').textContent),'3,2,1 のカウントが出る');
const seen=[];const w=setInterval(()=>{const t=$('#cdnn').textContent;if(seen[seen.length-1]!=t)seen.push(t)},20);
while(run('DYS.t0')==0&&Date.now()-t0<6000)await sleep(10);clearInterval(w);{const t=$('#cdnn').textContent;if(seen[seen.length-1]!=t)seen.push(t)}
const cd=run('DYS.t0');ok(cd>0,'カウント後にタイマーが動き出す');
ok(seen.join()=='3,2,1,GO!'||seen.join()=='2,1,GO!'||seen.join()=='1,GO!'||seen.includes('GO!'),'表示の順番 '+seen.join('→'));
ok(run('DY')==1&&run('G')&&$('#g').style.visibility=='','盤面が見えてプレイ開始');
ok(Date.now()-t0>=2950&&Date.now()-t0<3600,'開始から約3秒でスタート('+(Date.now()-t0)+'ms)');
ok($('#hb').hidden&&$('#bk').hidden&&$('#nx').hidden,'ヒント・戻る・次の盤面ボタンは隠れる');
r=await call('/api/daily/start',{method:'POST',body:JSON.stringify({token:run('DYS.tok')})});
/* ---- 6. 全部安全マスを開けてクリア ---- */
await sleep(1500);
run(`(()=>{for(let i=0;i<G.N;i++)if(!G.mines[i]&&!G.st[i]&&!G.done)act(i,0)})()`);
ok(run('G.done')==1,'全部開けてクリア');
await sleep(2200);
ok(!$('#fin').hidden&&$('#fint').textContent=='クリア!','結果カードが出る: '+$('#find').textContent);
j=run('DYS.res');ok(j&&j.ok&&j.ms>=1400&&j.ms<4500,'サーバー計測タイム '+j.ms+'ms(待ち約1.5秒+操作)');
ok(j.rank==1,'ランキング1位');
ok($('#fins').innerHTML.includes('⏱'),'タイム表示');
/* 同じ端末で2回目は不可 */
r=await call('/api/daily/start',{method:'POST',body:JSON.stringify({token:run('DYS.tok')})});
ok(r.status==409||(await r.json()).startedAt===undefined,'同じ端末は今日もう始められない');
$('#finb').onclick();await sleep(300);
ok(run('DYS.state')=='done'&&!$('#dyk').hidden&&$('#dyg').hidden,'戻るとスタートが盤面入手に置き換わる');
$('#dyk').onclick();await sleep(300);ok(ctx.__clip===CODE,'盤面入手で盤面コードがコピーされる');
await sleep(1800);
/* ---- 7. 別の端末: ミス ---- */
const tok2='ZZZZZZZZZZZZZZZZZZ';LS['msv.dailyToken']=tok2;run("DYS.tok=''");run("DYS.state=''");$('#dyn').value='ミスさん';
$('#mf').onclick();$('#mdy').onclick();await sleep(300);ok(run('DYS.state')=='new','別端末は new');
$('#dyg').onclick();await sleep(3600);ok(run('DY')==1,'2人目スタート');
run(`(()=>{const i=[...Array(G.N).keys()].find(i=>G.mines[i]&&!G.st[i]);act(i,0)})()`);ok(run('G.over')==1,'爆弾を踏む=即終了');
await sleep(2000);ok(!$('#fin').hidden&&$('#fint').textContent=='ミス…'&&$('#fin').className=='lose','ミスの結果カード');
$('#finb').onclick();await sleep(300);ok(run('DYS.state')=='done','ミスでも今日は終了');
/* ---- 8. 途中で離れた人(start だけして finish しない) ---- */
const tok3='YYYYYYYYYYYYYYYYYY';r=await call('/api/daily/start',{method:'POST',body:JSON.stringify({token:tok3})});ok(r.status==200,'3人目: start');
r=await call('/api/daily/status?token='+tok3);j=await r.json();ok(j.state=='playing','途中は playing');
r=await call('/api/daily/code?token='+tok3);ok(r.status==403,'途中の人には盤面コードを渡さない');
LS['msv.dailyToken']=tok3;run("DYS.tok=''");run("DYS.state=''");$('#mf').onclick();$('#mdy').onclick();await sleep(500);
ok(run('DYS.state')=='done'&&run('DYS.forfeit')==1,'戻ってきたらミス扱いで終了(1日1回)');
/* ---- 9. ランキング画面(過去日を直接入れて確認) ---- */
const yday=run(`(()=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)})()`.replace('today',"'"+today+"'"));
sql.prepare('INSERT INTO boards(day,code) VALUES(?,?)').run(yday,CODE);
sql.prepare('INSERT INTO ranks(day,name,ms,at) VALUES(?,?,?,?)').run(yday,'<b>先頭</b>',12345,1);sql.prepare('INSERT INTO ranks(day,name,ms,at) VALUES(?,?,?,?)').run(yday,'二番',23456,2);
r=await call('/api/daily/ranking');j=await r.json();
ok(r.status==200&&j.days.length==7&&j.days[0].today===true&&j.days[0].day==today&&j.days[0].code===null,'ランキングAPI: 先頭は今日・盤面コードは null');
ok(j.days[0].ranks.length==1&&j.days[0].ranks[0].name=='テスト太郎'&&!JSON.stringify(j.days[0]).includes('MS1.'),'ランキングAPI: 今日の順位は見える(コードは含まれない)');
ok(j.days[1].day==yday&&j.days[1].code===CODE,'ランキングAPI: 昨日以前はコードも付く');
const selTab=n=>$('#rkt').onclick({target:{closest:()=>({dataset:{n:String(n)}})}});
$('#dyr').onclick();await sleep(300);
ok($('#rkt').innerHTML.includes('>今日<')&&$('#rkl').innerHTML.includes('テスト太郎'),'ランキング画面: 最初は「今日」のタブで今日の順位が出る');
ok($('#rkl').innerHTML.includes('明日から見られます')&&!$('#rkl').innerHTML.includes('MS1.')&&!$('#rkl').innerHTML.includes('data-c'),'ランキング画面: 今日は「盤面コードは明日から」でコードもコピーも無し');
selTab(1);
ok(!$('#rk').hidden&&$('#rkl').innerHTML.includes('0:12.35')||$('#rkl').innerHTML.includes('0:12.34'),'ランキングにタイム表示');
ok($('#rkl').innerHTML.includes('&lt;b&gt;')&&!$('#rkl').innerHTML.includes('<b>先頭'),'名前はHTMLエスケープされる');
ok($('#rkl').innerHTML.includes('bcode')&&$('#rkl').innerHTML.includes(CODE),'盤面コードが小さく載る');
ok($('#rkt').innerHTML.split('<button').length-1==7,'今日+1〜6日前のタブが7つ');
if(run('BOARD_VER')>0){const oldC=CODE.replace(/^MS1\.\d+\./,'MS1.0.');sql.prepare('UPDATE boards SET code=? WHERE day=?').run(oldC,yday);
 $('#dyr').onclick();await sleep(300);selTab(1);const h=$('#rkl').innerHTML;
 ok(h.includes('バージョンアップ')&&!h.includes(oldC)&&!h.includes('data-c'),'ランキング: 古い番号の盤面コードは出さず「バージョンアップのため利用不可」(コピーもできない)');
 ctx.__clip=null;$('#rkl').onclick({target:{closest:s=>s=='.bcode[data-c]'?null:null}});ok(ctx.__clip==null,'ランキング: 古い盤面コードをタップしてもコピーされない');
 sql.prepare('UPDATE boards SET code=? WHERE day=?').run(CODE,yday)}
/* ---- 10. 古い番号の盤面は準備中扱い ---- */
const old=CODE.replace(/^MS1\.\d+\./,'MS1.0.');sql.prepare('UPDATE boards SET code=? WHERE day=?').run(old.replace(/^(MS1\.0\.)/,'MS1.0.'),today);
run('BOARD_VER_TEST=0');
const bv=run('BOARD_VER');
if(bv>0){LS['msv.dailyToken']='NEWDEVICENEWDEVICE';run("DYS.tok=''");run("DYS.state=''");$('#mf').onclick();$('#mdy').onclick();await sleep(500);ok(run('DYS.state')=='prep','ルール番号が古い盤面は prep('+bv+'>0)');}
else console.log('(BOARD_VER=0 のため、古い番号の検査は省略)');
/* ---- 11. メンテナンス(アプデのためデイリーを止める) ---- */
{const addD=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
 const tomorrow=addD(today,1),jr=(u,o)=>call(u,o).then(async x=>({s:x.status,j:await x.json().catch(()=>({}))})),mt=(m,b)=>jr('/api/admin/maint',{method:m,headers:adm,body:b?JSON.stringify(b):undefined});
 sql.prepare('UPDATE boards SET code=? WHERE day=?').run(CODE,today); /* 10 で古い番号にした今日の盤面を戻す */
 const PL='PLAYINGPLAYINGPLAY',NEW1='NEWDEVICEONENEWDEV',NEW2='NEWDEVICETWONEWDEV';
 const st=async t=>(await jr('/api/daily/status?token='+t)).j.state,startR=t=>jr('/api/daily/start',{method:'POST',body:JSON.stringify({token:t})});
 const openUI=async t=>{LS['msv.dailyToken']=t;run("DYS.tok=''");run("DYS.state=''");$('#mf').onclick();$('#mdy').onclick();await sleep(500)};
 /* 管理だけ */
 r=await call('/api/admin/maint');ok(r.status==401,'メンテAPI: トークンなし → 401');
 r=await call('/api/admin/maint',{method:'PUT',body:JSON.stringify({day:tomorrow})});ok(r.status==401,'メンテAPI: トークンなしでは予約できない');
 r=await call('/api/admin/maint',{method:'DELETE'});ok(r.status==401,'メンテAPI: トークンなしでは解除できない');
 r=await call('/api/admin/maint',{method:'PUT',headers:{authorization:'Bearer wrong','content-type':'application/json'},body:JSON.stringify({day:tomorrow})});ok(r.status==401,'メンテAPI: 違うトークン → 401');
 r=await jr('/ping');ok(r.j.maint===true,'/ping に maint(テーブルあり)');
 r=await mt('GET');ok(r.s==200&&r.j.phase=='none'&&!r.j.playBlocked&&!r.j.boardLocked,'最初はメンテなし');
 /* 予約の入力検査 */
 for(const[d,why]of[[addD(today,-1),'昨日'],[addD(today,31),'31日先'],['2026-13-45','存在しない日付'],['あした','日付でない']]){r=await mt('PUT',{day:d});ok(r.s==400,'予約できない: '+why+'(400)')}
 /* 予約中(前日に予約): まだ何も止まらない */
 r=await mt('PUT',{day:tomorrow});ok(r.s==200&&r.j.phase=='reserved'&&r.j.day==tomorrow&&!r.j.playBlocked&&!r.j.boardLocked,'明日を予約 → 予約中');
 ok(await st(NEW1)=='new','予約中は今日まだ普通に遊べる');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:tomorrow,code:CODE})});ok(r.status==200,'予約中は盤面の登録もできる(今日の分を置き換えるとプレイ記録が消えるので、検査は明日の分で)');
 r=await mt('PUT',{day:addD(today,3)});ok(r.s==200&&r.j.replaced===true&&r.j.day==addD(today,3),'予約中なら日付を置き換えられる');
 r=await mt('DELETE');ok(r.s==200&&r.j.lifted===true&&r.j.phase=='none','予約を取り消せる');
 r=await mt('DELETE');ok(r.s==200&&r.j.lifted===false,'何も無いときの解除は害なし');
 /* 始めたけど終わっていない端末を1つ作っておく(更新が始まる前から遊んでいた人) */
 r=await startR(PL);ok(r.s==200,'更新前に1人が始めている');
 /* 今日を指定 = 今すぐ更新中 */
 r=await mt('PUT',{day:today});ok(r.s==200&&r.j.phase=='active'&&r.j.playBlocked&&r.j.boardLocked,'今日を指定 → 更新中(遊べない+盤面ロック)');
 ok(await st(NEW1)=='maint','新しい端末の状態は maint');
 ok(await st(PL)=='playing','すでに始めていた端末は playing のまま');
 ok(await st('YYYYYYYYYYYYYYYYYY')=='done','すでに終わった端末は done のまま');
 r=await startR(NEW1);ok(r.s==423&&r.j.err=='maint'&&!r.j.code,'スタートは 423 maint で断る(盤面は渡さない)');
 r=await startR(PL);ok(r.s==200&&r.j.code===CODE,'すでに始めていた端末は再取得できる(応答が届かなかった人)');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:addD(today,1),code:CODE})});j=await r.json();ok(r.status==423&&j.err=='maint','更新中は新しい盤面を受け付けない(423)');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:today,code:CODE})});ok(r.status==423,'更新中は force の作り直しも受け付けない');
 r=await call('/api/admin/board?day='+today,{headers:adm});ok(r.status==200,'更新中でも「盤面があるか」の確認はできる');
 r=await mt('PUT',{day:addD(today,2)});ok(r.s==409&&r.j.err=='active','更新中に別の予約で上書きはできない(409)');
 /* それ以外は普通に使える */
 r=await call('/api/daily/ranking');j=await r.json();ok(r.status==200&&j.days.length==7&&j.days[0].ranks.length>=1,'更新中もランキングは見られる');
 r=await call('/api/daily/code?token=YYYYYYYYYYYYYYYYYY');j=await r.json();ok(r.status==200&&j.code===CODE,'更新中も遊び終えた端末は盤面入手(コードコピー)できる');
 r=await call('/api/daily/finish',{method:'POST',body:JSON.stringify({token:PL,day:today,clear:false})});ok(r.status==200,'更新中も、すでに始めていた人の「終了」は受け付ける');
 /* 画面 */
 await openUI(NEW2);
 ok(run('DYS.state')=='maint','画面: 更新中の状態になる');
 ok($('#dys').textContent.includes('更新中のため遊べません'),'画面: 「更新中のため遊べません」が出る → '+$('#dys').textContent);
 ok($('#dyg').textContent.includes('更新中')&&$('#dyk').hidden,'画面: スタートの代わりに「更新中」ボタン');
 $('#dyr').onclick();await sleep(300);ok(!$('#rk').hidden&&$('#rkl').innerHTML.includes('rkr'),'画面: 更新中もランキングが開ける');$('#rkx').onclick();
 await openUI('YYYYYYYYYYYYYYYYYY');ok(run('DYS.state')=='done'&&!$('#dyk').hidden,'画面: 遊び終えた端末は更新中でも「盤面入手」が出る');
 $('#dyk').onclick();ctx.__clip=null;await sleep(300);ok(ctx.__clip===CODE,'画面: 更新中も盤面コードをコピーできる');await sleep(2300);
 /* 画面を開いたあとに更新が始まった場合(スタートを押したら 423) */
 await mt('DELETE');await openUI('LATEBREAKLATEBREAK');ok(run('DYS.state')=='new','(解除した状態では普通に new)');
 $('#dyn').value='おそい';$('#dyn').oninput();await mt('PUT',{day:today});
 $('#dyg').onclick();await sleep(500);ok(run('DYS.state')=='maint'&&run('DY')==0,'画面: スタートを押した瞬間に更新が始まっていたら「更新中」になり、始まらない');
 /* 解除 → 60秒待たず、再読み込みで戻る */
 r=await mt('DELETE');ok(r.s==200&&r.j.lifted===true&&r.j.phase=='none'&&!r.j.playBlocked&&!r.j.boardLocked,'解除 → その場で遊べる・盤面も受け付ける');
 $('#dyg').onclick();await sleep(500);ok(run('DYS.state')=='new'&&!$('#dyg').disabled,'画面: 更新中ボタンをタップすると、解除済みならスタートに戻る');
 ok(await st(NEW1)=='new','解除後は新しい端末も new');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:addD(today,1),code:CODE})});ok(r.status==200,'解除後は盤面を受け付ける');
 /* 日付が過ぎても、解除するまで盤面ロックは続く(遊ぶのは再開) */
 sql.prepare('INSERT INTO maint(id,day) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day').run(addD(today,-1));
 r=await mt('GET');ok(r.j.phase=='overdue'&&!r.j.playBlocked&&r.j.boardLocked,'更新日を過ぎて未解除 → overdue(遊べるが、盤面ロックのまま)');
 ok(await st(NEW1)=='new','overdue: 次の 0:00 を過ぎたのでデイリーは遊べる');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:addD(today,1),code:CODE})});ok(r.status==423,'overdue: 解除するまで盤面は受け付けない(自動では戻らない)');
 r=await mt('PUT',{day:today});ok(r.s==409,'overdue: 上書き予約は 409(先に解除)');
 r=await mt('DELETE');ok(r.j.lifted===true&&r.j.phase=='none','overdue を解除');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:addD(today,1),code:CODE})});ok(r.status==200,'解除したので盤面を受け付ける');
 /* schema.sql を実行していない環境(maint テーブルが無い) */
 sql.exec('DROP TABLE maint');
 ok(await st(NEW1)=='new','テーブルが無くても status は普通に動く');
 r=await startR('NOTABLENOTABLENOTA');ok(r.s==200,'テーブルが無くても start は普通に動く');
 r=await call('/api/admin/board',{method:'PUT',headers:adm,body:JSON.stringify({day:tomorrow,code:CODE})});ok(r.status==200,'テーブルが無くても盤面の登録は普通に動く');
 r=await jr('/ping');ok(r.j.ok&&r.j.tables===true&&r.j.maint===false,'/ping: maint=false でも tables は true(既存の workflow は止まらない)');
 r=await mt('GET');ok(r.s==200&&r.j.phase=='none','テーブルが無いときの GET は「なし」');
 r=await mt('PUT',{day:tomorrow});ok(r.s==200&&r.j.phase=='reserved','予約するとテーブルが自動で作られる');
 r=await mt('DELETE');ok(r.j.lifted===true,'後片づけ(解除)');
}
console.log('E2E OK');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
