/* ブラウザなしで CORE + rules を読み込み、ルール検査を走らせる(AIが作業後に自分で検証する用)。
   使い方(プロジェクト直下で):
     node tools/headless.js                全ルールの単体 + 全ペア検査
     node tools/headless.js myRule         myRule の単体 + myRule を含む全ペア
     node tools/headless.js a b            a と b の単体 + a,b を含む全ペア
     node tools/headless.js --combo a,b,c  指定した縛りの同時適用を 7x7 で5回生成(失敗数と時間を表示)
   読み込み: index.html の <script src="js/core/..."> を順に + rules/*.js(_始まり除く)。UI(js/game, js/ui)は読まない。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=[...html.matchAll(/<script src="(js\/core\/[^"]+)"><\/script>/g)].map(m=>m[1]);
const rules=fs.readdirSync(path.join(root,'rules')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')).sort().map(f=>'rules/'+f);
const code=[...core,...rules].map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const args=process.argv.slice(2),ci=args.indexOf('--combo');
const driver=ci>=0?`
(async()=>{const ids=${JSON.stringify(ci>=0?(args[ci+1]||'').split(','):[])};
 for(const id of ids)if(!RULES[id])return console.log('unknown rule: '+id);
 const R=7,C=7,M=mpick(R,C,10,ids);if(!M)return console.log('7x7 で成り立つ爆弾数がありません');const cfg={R,C,M,ids};let ok=0,ng=0,t0=Date.now();
 for(let k=0;k<5;k++){try{(await gen(cfg,{qms:1500,hard:8000}))?ok++:ng++}catch(e){ng++;console.log('error: '+e.message)}}
 console.log('combo '+ids.join('+')+' (M='+M+'): ok '+ok+' / ng '+ng+', '+((Date.now()-t0)/1000).toFixed(1)+'s');
})()`:`
(async()=>{const only=${JSON.stringify(args)};
 if(RULE_ERR.length)console.log('登録エラー: '+RULE_ERR.join(' / '));
 for(const id of only)if(!RULES[id])return console.log('unknown rule: '+id);
 const t0=Date.now();await selfTest(only);console.log(buildReport());console.log('('+((Date.now()-t0)/1000).toFixed(1)+'s)');
})()`;
const ctx=vm.createContext({performance,setTimeout,console,Date,Uint8Array,Int8Array,Int32Array});
vm.runInContext(code+'\n'+driver,ctx).catch(e=>{console.error(e);process.exit(1)});
