/* 厳選盤面を1つ作って {code} を JSON で書き出す(GitHub Actions 用)。使い方(プロジェクト直下で):
     node tools/pick-gen.js <出力.json>
   見つからなかったときはファイルを書かずに正常終了する(workflow は「ファイルがあるときだけ」送る)。
   厳選盤面は公開されるので、ログには縛り・難易度の数字も出してよい(調整用)。読み込みは tools/daily-gen.js と同じ。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const out=process.argv[2];
if(!out)return console.error('使い方: node tools/pick-gen.js <出力.json>')||process.exit(1);
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=[...html.matchAll(/<script src="(js\/core\/[^"]+)"><\/script>/g)].map(m=>m[1]);
const rules=fs.readdirSync(path.join(root,'rules')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')).sort().map(f=>'rules/'+f);
const code=[...core,...rules,'tools/daily-plan.js','tools/pick-plan.js'].map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const driver=`
(async()=>{if(RULE_ERR.length)throw Error('ルール登録エラー: '+RULE_ERR.join(' / '));
 const r=await pickMake(m=>console.log(m));if(!r)return null;
 const c=boardEncode(r.cfg,r.res),d=boardDecode(c);
 if(!d.ok||d.cfg.M!=r.cfg.M||d.res.start!=r.res.start||d.res.mines.some((x,i)=>x!=r.res.mines[i]))throw Error('盤面コードの往復が一致しません');
 return{code:c,tries:r.tries,sec:r.sec,info:r.cfg.R+'x'+r.cfg.C+' 爆弾'+r.cfg.M+' 縛り['+(r.cfg.ids.join('+')||'なし')+'] 最重'+r.m.maxc+'通り 詰まり'+r.m.deep+'回'}})()`;
const ctx=vm.createContext({performance,setTimeout,console,Date,Uint8Array,Int8Array,Int32Array,DAILY_DEBUG:false});
vm.runInContext(code+'\n'+driver,ctx).then(r=>{
 if(!r){console.log('NONE: 今回は見つかりませんでした(厳選は出なくてもよいので正常終了)');return}
 fs.writeFileSync(out,JSON.stringify({code:r.code}));console.log('OK 試行'+r.tries+'回 '+r.sec.toFixed(1)+'秒 '+r.info)})
 .catch(e=>{console.error(e.message);process.exit(1)});
