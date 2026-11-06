/* UI(js/game, js/ui)を偽DOMで読み込んで一通り動かすスモークテスト。ブラウザ不要。
   使い方: node tools/smoke-ui.js
   見るのは「例外が出ない / 盤面が作られる / 開ける・旗・ヒント・縛りモーダル・例盤面が動く」まで。見た目は確認できない。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const rules=fs.readdirSync(path.join(root,'rules')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')).map(f=>'rules/'+f);
const list=srcs.filter(f=>!f.startsWith('rules/')).flatMap(f=>f=='js/game/state.js'?[...rules,f]:[f]);
const code=list.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const defaults={R:7,C:7,M:8,X:3,L:1,H:3,K:1};
const els={},loads=[];
function El(id){this.id=id;this.value=defaults[id]??'';this.checked=false;this.hidden=false;this.innerHTML='';this.textContent='';this.className='';this.dataset={};this.disabled=false;
 const on=new Set(id=='mf'||id=='fo'?['on']:[]);
 this.classList={toggle:(c,f)=>{(f===undefined?!on.has(c):f)?on.add(c):on.delete(c)},add:c=>on.add(c),remove:c=>on.delete(c),contains:c=>on.has(c)};
 this.style={setProperty(){}};this.addEventListener=()=>{};this.select=()=>{};this.closest=()=>null}
const document={querySelector:s=>els[s]||(els[s]=new El(s.replace(/^#/,''))),createElement:()=>new El('a')};
const window={addEventListener:(t,f)=>t=='load'&&loads.push(f)};
const driver=`
(async()=>{const log=[],ok=(c,m)=>{if(!c)throw Error('FAIL: '+m);log.push('ok: '+m)};
 /* 深い比較(typed array 対応。dropped は盤面に関係しないので無視) */
 const eqv=(a,b)=>{if(a===b)return true;if(a&&b&&typeof a=='object'&&typeof b=='object'){if(ArrayBuffer.isView(a))return ArrayBuffer.isView(b)&&a.constructor.name==b.constructor.name&&a.length==b.length&&a.every((x,i)=>x==b[i]);const f=o=>Object.keys(o).filter(k=>k!='dropped'),ka=f(a),kb=f(b);return Array.isArray(a)==Array.isArray(b)&&ka.length==kb.length&&ka.every(k=>eqv(a[k],b[k]))}return a!==a&&b!==b};
 const wait=async(f,ms=30000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)throw Error('timeout');await new Promise(r=>setTimeout(r,50))}};
 loads.forEach(f=>f());ok(RULE_ERR.length==0,'ルール登録エラーなし');
 ok($('#ctx').value.includes('検査レポート'),'レポート欄が初期表示される');
 $('#pk').onclick();ok(!$('#md').hidden&&$('#ml').innerHTML.includes('data-rid'),'縛りモーダルが開き一覧が出る');
 $('#mq').value='十字';$('#mq').oninput();ok($('#ml').innerHTML.includes('cross')&&!$('#ml').innerHTML.includes('knight'),'検索で絞れる');
 $('#mq').value='';$('#mok').onclick();
 for(const id of Object.keys(RULES)){
  SEL.clear();SEL.add(id);$('#R').value=7;$('#C').value=7;$('#M').value=8;updSel();upd();
  ok(!$('#go').disabled,id+': スタート可');
  $('#go').onclick();await wait(()=>G&&!G.over&&$('#g').innerHTML.length>0);
  ok(G.cfg.ids.includes(id)&&G.rev>0,id+': 盤面生成と自動オープン');
  ok(G.seed&&G.seed.startsWith('v1.')&&!$('#sc').hidden,id+': シードが出る');
  {const sd=decodeSeed(G.seed),g0=G;ok(!!sd,id+': シードが読める');begin(sd.cfg,sd.res);const g1=G;G=g0;draw();ok(eqv(g0,g1),id+': シードから作り直した G が完全一致(盤面を決める情報は res と cfg だけで足りている)')}
  const safe=[...Array(G.N).keys()].find(i=>!G.mines[i]&&!G.st[i]);const r0=G.rev;act(safe,0);ok(G.rev>r0||G.done,id+': 安全マスを開ける');
  const f=[...Array(G.N).keys()].find(i=>!G.st[i]);act(f,1);ok(G.fl[f]==1,id+': 旗');
  $('#hb').onclick();ok(hm==1,id+': ヒントON');ask('c');ask('r',id);$('#hb').onclick();
  $('#rv').onclick();ok($('#ml').innerHTML.includes(id),id+': 盤面の縛り一覧');$('#mx').onclick();
  await showEx([id],'t');ok($('#el').innerHTML.includes('OK例'),id+': 例盤面');
  $('#bk').onclick()}
 {SEL.clear();SEL.add('cross');$('#mf').onclick();$('#go').onclick();await wait(()=>G&&$('#g').innerHTML.length>0);
  const s0=G.seed,m0=Array.from(G.mines),n0=Array.from(G.num);ok(!!s0,'シード用: フリープレイで盤面生成');$('#bk').onclick();
  $('#ms').onclick();ok(mode()=='s'&&!$('#sdc').hidden&&$('#bc').hidden&&$('#rc').hidden,'シードモード: 入力欄が出て盤面・縛り欄が隠れる');
  $('#sd').value='';upd();ok($('#go').disabled,'シード空ならスタート不可');
  $('#sd').value='v1.zzz';upd();$('#go').onclick();ok($('#mw').textContent.includes('読み込めません'),'不正なシードは断る');
  $('#sd').value=' '+s0+'\n';upd();ok(!$('#go').disabled,'シード入力でスタート可');$('#go').onclick();await wait(()=>G&&$('#g').innerHTML.length>0);
  ok(G.seed==s0&&Array.from(G.mines).every((x,i)=>x==m0[i])&&Array.from(G.num).every((x,i)=>x==n0[i])&&!run,'シードから完全に同じ盤面で始まる(フリープレイ扱い)');
  $('#bk').onclick();$('#mf').onclick();ok(mode()=='f'&&$('#sdc').hidden&&!$('#bc').hidden,'フリープレイに戻すと元の欄に戻る')}
 SEL.clear();Object.keys(RULES).forEach(i=>SEL.add(i));$('#mc').onclick();$('#go').onclick();await wait(()=>G&&$('#g').innerHTML.length>0);
 ok(run&&G,'チャレンジ開始(縛り '+G.cfg.ids.join('+')+')');ok(G.seed===''&&$('#sc').hidden,'チャレンジにはシードボタンなし');
 return log})()`;
const ctx=vm.createContext({document,window,performance,setTimeout,console,Date,Uint8Array,Int8Array,Int32Array,innerWidth:400,scrollTo(){},navigator:{},btoa,atob,TextEncoder,TextDecoder,loads});
vm.runInContext(code+'\n'+driver,ctx).then(l=>{l.forEach(x=>console.log(x));console.log('SMOKE OK');process.exit(0)},e=>{console.error(e);process.exit(1)});
