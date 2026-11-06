/* UI(js/game, js/ui)を偽DOMで読み込んで一通り動かすスモークテスト。ブラウザ不要。
   使い方: node tools/smoke-ui.js
   見るのは「例外が出ない / 盤面が作られる / 開ける・旗・ヒント・縛りモーダル・例盤面が動く / チャレンジの通し(抽選範囲・ヒント・ミス・クリア・達成・ゲームオーバー・引き直し・ウィンストリーク)」まで。見た目は確認できない。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const rules=fs.readdirSync(path.join(root,'rules')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')).map(f=>'rules/'+f);
const list=srcs.filter(f=>!f.startsWith('rules/')).flatMap(f=>f=='js/game/state.js'?[...rules,f]:[f]);
const code=list.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const defaults={R:7,C:7,M:8},LS={};
const els={},loads=[];
function El(id){this.id=id;this.value=defaults[id]??'';this.checked=false;this.hidden=false;this.innerHTML='';this.textContent='';this.className='';this.dataset={};this.disabled=false;
 const on=new Set(id=='mf'||id=='fo'?['on']:[]);
 this.classList={toggle:(c,f)=>{(f===undefined?!on.has(c):f)?on.add(c):on.delete(c)},add:c=>on.add(c),remove:c=>on.delete(c),contains:c=>on.has(c)};
 this.style={setProperty(){}};this.addEventListener=()=>{};this.select=()=>{};this.closest=()=>null}
const document={querySelector:s=>els[s]||(els[s]=new El(s.replace(/^#/,''))),createElement:()=>new El('a')};
const window={addEventListener:(t,f)=>t=='load'&&loads.push(f)};
const driver=`
(async()=>{const log=[],ok=(c,m)=>{if(!c)throw Error('FAIL: '+m);log.push('ok: '+m);console.log('ok: '+m)};
 const wait=async(f,ms=30000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)throw Error('timeout');await new Promise(r=>setTimeout(r,50))}};
 loads.forEach(f=>f());ok(RULE_ERR.length==0,'ルール登録エラーなし');
 ok($('#ctx').value.includes('検査レポート'),'レポート欄が初期表示される');
 $('#pk').onclick();ok(!$('#md').hidden&&$('#ml').innerHTML.includes('data-rid'),'縛りモーダルが開き一覧が出る');
 $('#mq').value='十字';$('#mq').oninput();ok($('#ml').innerHTML.includes('cross')&&!$('#ml').innerHTML.includes('knight'),'検索で絞れる');
 $('#mq').value='';$('#mok').onclick();
 for(const id of Object.keys(RULES)){
  SEL.clear();SEL.add(id);$('#R').value=7;$('#C').value=7;$('#M').value=mpick(7,7,8,[id])||8;updSel();upd(); /* 爆弾数は縛りが成り立つ最小値(tidy のように範囲が決まっているルール用。ほかは8のまま) */
  ok(!$('#go').disabled,id+': スタート可');
  $('#go').onclick();await wait(()=>G&&!G.over&&$('#g').innerHTML.length>0);
  ok(G.cfg.ids.includes(id)&&G.rev>0,id+': 盤面生成と自動オープン');
  const safe=[...Array(G.N).keys()].find(i=>!G.mines[i]&&!G.st[i]);const r0=G.rev;act(safe,0);ok(G.rev>r0||G.done,id+': 安全マスを開ける');
  const f=[...Array(G.N).keys()].find(i=>!G.st[i]);act(f,1);ok(G.fl[f]==1,id+': 旗');
  $('#hb').onclick();ok(hm==1,id+': ヒントON');ask('c');ask('r',id);$('#hb').onclick();
  $('#rv').onclick();ok($('#ml').innerHTML.includes(id),id+': 盤面の縛り一覧');$('#mx').onclick();
  await showEx([id],'t');ok($('#el').innerHTML.includes('OK例'),id+': 例盤面');
  $('#bk').onclick()}
 SEL.clear();Object.keys(RULES).forEach(i=>SEL.add(i));$('#mc').onclick();$('#go').onclick();await wait(()=>G&&$('#g').innerHTML.length>0);
 ok(run&&G,'チャレンジ開始(縛り '+G.cfg.ids.join('+')+')');
 /* ---- チャレンジの通し ---- */
 const K0=CHALLENGE,sleep=ms=>new Promise(r=>setTimeout(r,ms));
 ok((!K0.square||G.cfg.R==G.cfg.C)&&G.cfg.R>=K0.sizeMin&&G.cfg.R<=K0.sizeMax&&G.cfg.C>=K0.sizeMin&&G.cfg.C<=K0.sizeMax,'チャレンジ: 盤面サイズが範囲内');
 ok(G.cfg.ids.length>=K0.rulesMin&&G.cfg.ids.length<=K0.rulesMax,'チャレンジ: 縛りの数が範囲内');
 ok(run.lives==K0.lives&&run.hints==K0.hints&&run.stage==1&&run.streak==0,'チャレンジ: 初期状態');
 let bad=0;for(let k=0;k<300;k++){const f=chPlan(),n=f.R*f.C;if(f.R<K0.sizeMin||f.R>K0.sizeMax||f.C<K0.sizeMin||f.C>K0.sizeMax||f.M<1||f.M>n-12||f.ids.length>K0.rulesMax||!mok(f.R,f.C,f.M,f.ids))bad++}
 ok(bad==0,'チャレンジ: 抽選300回でサイズ・爆弾数・縛りが整合');
 /* 以降は生成を軽くするため、7x7・爆弾8個・縛り1個に固定する(爆弾8個で使えないルール=tidy などは抽選から外れる) */
 Object.assign(CHALLENGE,{sizeMin:7,sizeMax:7,bombMin:8/49,bombMax:8/49,rulesMin:1,rulesMax:1});console.log('--- チャレンジ通し(7x7・爆弾8・縛り1個に固定) ---');
 const ready=async()=>{const t=Date.now();while(!(G&&$('#g').innerHTML.length>0)){if(Date.now()-t>120000)throw Error('timeout: チャレンジの盤面が出ない');if(!G&&!$('#rg').hidden&&$('#ldt').textContent.includes('見つからなかった')){console.log('  (生成失敗 → 引き直し)');$('#rg').onclick()}await sleep(50)}};
 const clearAll=()=>{for(let i=0;i<G.N;i++)if(!G.mines[i]&&!G.st[i]&&!G.done)act(i,0)};
 const missOne=()=>{const i=[...Array(G.N).keys()].find(i=>G.mines[i]&&!G.st[i]);act(i,0)};
 const next=async()=>{ok(!$('#nx').hidden&&$('#nx').textContent=='次の盤面','チャレンジ: 次の盤面ボタンが出る');console.log('  次の盤面を生成中…');$('#nx').onclick();await ready()};
 $('#rg').onclick();await ready();
 ok(run.stage==1&&run.lives==K0.lives,'チャレンジ: 引き直しても盤面番号は進まない');
 for(let k=0;k<K0.hints;k++)ask('c');
 ok(run.hints==0&&$('#hb').disabled,'チャレンジ: ヒントを使い切ると押せない');
 ask('c');ok(run.hints==0,'チャレンジ: ヒントは0より減らない');
 clearAll();ok(G.done&&run.streak==1&&!run.end,'チャレンジ: 1盤面クリア');
 await next();ok(run.stage==2&&run.hints==K0.hints,'チャレンジ: 次の盤面でヒントが回復');
 missOne();ok(G.over&&run.lives==K0.lives-1,'チャレンジ: ミスでライフ-1・盤面は終了');
 ok(run.streak==(K0.missResetsStreak?0:1),'チャレンジ: ミス時のクリア数が設定どおり');
 await next();
 let guard=0;while(!run.end&&guard++<8){clearAll();if(!run.end)await next()}
 ok(run.end=='win'&&$('#nx').hidden,'チャレンジ: 目標に達すると達成(次へボタンなし)');
 await wait(()=>!$('#fin').hidden,5000);
 ok($('#fint').textContent.includes('達成')&&chStreak()==1,'チャレンジ: 達成演出とウィンストリーク+1');
 $('#finr').onclick();await ready();
 ok(run.stage==1&&run.lives==K0.lives&&run.streak==0&&$('#fin').hidden,'チャレンジ: もう一度挑戦で新しい挑戦');
 for(let k=0;k<K0.lives;k++){missOne();if(k<K0.lives-1){ok(!run.end,'チャレンジ: ライフが残っていれば続く');await next()}}
 ok(run.end=='lose'&&run.lives==0,'チャレンジ: ライフ0でゲームオーバー');
 await wait(()=>!$('#fin').hidden,5000);
 ok($('#fin').className=='lose'&&chStreak()==0,'チャレンジ: ゲームオーバー演出とウィンストリーク0');
 $('#finb').onclick();ok($('#fin').hidden&&!$('#setup').hidden&&$('#chw').innerHTML.includes('<b>0</b>'),'チャレンジ: タイトルへ戻る');
 return log})()`;
const localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v)}};
const ctx=vm.createContext({localStorage,document,window,performance,setTimeout,console,Date,Uint8Array,Int8Array,Int32Array,innerWidth:400,scrollTo(){},navigator:{},loads});
vm.runInContext(code+'\n'+driver,ctx).then(l=>{console.log('SMOKE OK');process.exit(0)},e=>{console.error(e);process.exit(1)});
