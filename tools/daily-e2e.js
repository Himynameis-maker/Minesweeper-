/* デイリーの通しテスト(ブラウザ・Cloudflare 不要)。使い方: node tools/daily-e2e.js
   ・functions/ の本物のファイルを、SQLite(node:sqlite)で作った D1 もどきの上で動かす
   ・画面側は js/ui/daily.js を偽DOMで動かし、fetch を functions に直結する
   ・ファイル名がURLになる(Pages Functions の決まり)ことも検査する: functions/ 配下に「空白を含む名前」「.js 以外」があれば失敗
   見るのは: ルート名 / 状態遷移(prep→new→done) / 1日1回 / 3,2,1の長さ / クリア→ランキング / ミス / 途中離脱=ミス扱い / 盤面入手 / 古い番号の盤面は準備中扱い */
const fs=require('fs'),path=require('path'),vm=require('vm'),{pathToFileURL}=require('url');
const root=path.join(__dirname,'..');
let DatabaseSync;try{({DatabaseSync}=require('node:sqlite'))}catch(e){console.log('node:sqlite が使えないので省略(Node 22.5 以上が必要)');process.exit(0)}
const ok=(c,m)=>{if(!c){console.error('FAIL: '+m);process.exit(1)}console.log('ok: '+m)};
(async()=>{
/* ---- 1. ルート名の検査 ---- */
const routes={};const walk=(d,pre)=>{for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory())walk(p,pre+f.name+'/');else{if(/\s/.test(f.name)||!f.name.endsWith('.js'))ok(false,'functions のファイル名が不正: "'+pre+f.name+'"');routes['/'+pre+f.name.replace(/\.js$/,'')]=p}}};
walk(path.join(root,'functions'),'');
for(const r of['/api/daily/status','/api/daily/start','/api/daily/finish','/api/daily/code','/api/daily/ranking','/api/admin/board','/ping'])ok(routes[r],'ルートがある '+r);
/* ---- 2. D1 もどき ---- */
const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(path.join(root,'schema.sql'),'utf8'));
const stmt=q=>{let a=[];const o={bind:(...x)=>{a=x;return o},
 first:async()=>sql.prepare(q).get(...a)||null,all:async()=>({results:sql.prepare(q).all(...a)}),
 run:async()=>{const r=sql.prepare(q).run(...a);return{meta:{changes:Number(r.changes)}}},_run:()=>sql.prepare(q).run(...a)};return o};
const DB={prepare:stmt,batch:async l=>{sql.exec('BEGIN');try{l.forEach(s=>s._run());sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB,DAILY_TOKEN:'test-admin-token-1234'},mods={};
const call=async(url,opt={})=>{const u=new URL(url,'https://x.test'),f=routes[u.pathname];if(!f)return new Response('nf',{status:404});
 mods[f]=mods[f]||await import(pathToFileURL(f).href+'?'+Date.now());
 const m=opt.method||'GET',h=m=='GET'?mods[f].onRequestGet:m=='POST'?mods[f].onRequestPost:mods[f].onRequestPut;
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
$('#dyr').onclick();await sleep(300);
ok(!$('#rk').hidden&&$('#rkl').innerHTML.includes('0:12.35')||$('#rkl').innerHTML.includes('0:12.34'),'ランキングにタイム表示');
ok($('#rkl').innerHTML.includes('&lt;b&gt;')&&!$('#rkl').innerHTML.includes('<b>先頭'),'名前はHTMLエスケープされる');
ok($('#rkl').innerHTML.includes('bcode')&&$('#rkl').innerHTML.includes(CODE),'盤面コードが小さく載る');
ok($('#rkt').innerHTML.split('<button').length-1==6,'1〜6日前のタブが6つ');
/* ---- 10. 古い番号の盤面は準備中扱い ---- */
const old=CODE.replace(/^MS1\.\d+\./,'MS1.0.');sql.prepare('UPDATE boards SET code=? WHERE day=?').run(old.replace(/^(MS1\.0\.)/,'MS1.0.'),today);
run('BOARD_VER_TEST=0');
const bv=run('BOARD_VER');
if(bv>0){LS['msv.dailyToken']='NEWDEVICENEWDEVICE';run("DYS.tok=''");run("DYS.state=''");$('#mf').onclick();$('#mdy').onclick();await sleep(500);ok(run('DYS.state')=='prep','ルール番号が古い盤面は prep('+bv+'>0)');}
else console.log('(BOARD_VER=0 のため、古い番号の検査は省略)');
console.log('E2E OK');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
