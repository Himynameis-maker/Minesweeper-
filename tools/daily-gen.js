/* デイリー盤面を1つ作って {day,code} を JSON で書き出す(GitHub Actions 用)。使い方(プロジェクト直下で):
     node tools/daily-gen.js <出力.json> <YYYY-MM-DD>
   読み込みは tools/headless.js と同じ(index.html の js/core の script + rules/*.js)に tools/daily-plan.js を足す。
   標準出力・標準エラーには盤面の中身を出さない(ログが公開されても翌日の盤面が漏れないように)。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const[out,day]=process.argv.slice(2);
if(!out||!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return console.error('使い方: node tools/daily-gen.js <出力.json> <YYYY-MM-DD>')||process.exit(1);
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=[...html.matchAll(/<script src="(js\/core\/[^"]+)"><\/script>/g)].map(m=>m[1]);
const rules=fs.readdirSync(path.join(root,'rules')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')).sort().map(f=>'rules/'+f);
const code=[...core,...rules,'tools/daily-plan.js'].map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const driver=`
(async()=>{if(RULE_ERR.length)throw Error('ルール登録エラー: '+RULE_ERR.join(' / '));
 const r=await dailyMake(m=>console.log(m)),c=boardEncode(r.cfg,r.res),d=boardDecode(c);
 if(!d.ok||d.cfg.M!=r.cfg.M||d.res.start!=r.res.start||d.res.mines.some((x,i)=>x!=r.res.mines[i]))throw Error('盤面コードの往復が一致しません');
 return{code:c,tries:r.tries,sec:r.sec}})()`;
const ctx=vm.createContext({performance,setTimeout,console,Date,Uint8Array,Int8Array,Int32Array});
vm.runInContext(code+'\n'+driver,ctx).then(r=>{fs.writeFileSync(out,JSON.stringify({day,code:r.code}));console.log('OK '+day+' 試行'+r.tries+'回 '+r.sec.toFixed(1)+'秒')})
 .catch(e=>{console.error(e.message);process.exit(1)});
