/* デイリーの連勝記録だけの検査(サーバー・ブラウザ不要)。使い方: node tools/daily-streak.js
   js/ui/daily.js の連勝まわり(dyStreak* / dyAbandon / dySettle / dySend)を、偽の localStorage と偽の通信で動かす。
   見るのは: 日付が離れても途切れない / ミス・途中離脱・タブを閉じて放置=0 / クリアはサーバーが受け付けたときだけ +1 /
   通信エラー・別タブ・二重送信・保存が壊れているとき */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ok=(c,m)=>{if(!c){console.error('FAIL: '+m);process.exit(1)}console.log('ok: '+m)};
const LS={'msv.dailyToken':'T'.repeat(24)},KEY='msv.dailyStreak';
const ctx=vm.createContext({localStorage:{getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v)}},window:{addEventListener(){}},document:{},console,Date,setTimeout:f=>{f();return 0},clearTimeout(){},Math,JSON,Number,String,Array,Uint8Array});
const run=s=>vm.runInContext(s,ctx);
run('let DY=0');vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','ui','daily.js'),'utf8'),ctx,{filename:'daily.js'});
const st=()=>JSON.parse(LS[KEY]||'{}'),put=o=>{LS[KEY]=JSON.stringify(o)},n=()=>run('dyStreakNow()');
/* 次の dySend が受け取る通信結果を並べる。{ok,status,j} */
const net=list=>{ctx.__q=list.slice();run('dyApi=async()=>__q.shift()')};
const OK={ok:true,status:200,j:{ok:true,ms:5000,rank:1}},E409={ok:false,status:409,j:{err:'noplay'}},E0={ok:false,status:0,j:{}},E400={ok:false,status:400,j:{err:'day'}};
const play=(day,clear,q)=>{run(`DYS.day='${day}';DYS.clear=${clear}`);run(`dyStreakStart('${day}')`);if(clear)run(`dyStreakWon('${day}')`);else run('dyStreakLoss()');net(q)};
(async()=>{
/* 1. 保存の読み書き */
LS[KEY]='壊れた';ok(n()==0,'壊れた保存は 0 として扱う(落ちない)');
put({last:'2026-01-01',n:4});ok(n()==4,'旧形式 {last,n} の n を連勝として引き継ぐ(日付が離れていても 0 にならない)');
/* 2. 日が空いても続く */
put({n:2,pend:'',won:0});play('2026-11-20',true,[OK]);await run('dySend()');ok(n()==3&&st().pend=='','何日空けてもクリアで +1(2→3)');
/* 3. ミスは通信の前に 0。送信が失敗しても戻らない */
put({n:5,pend:'',won:0});play('2026-11-21',false,[E0,E0,E0]);ok(n()==0&&st().pend=='','ミスは送信前に 0 で保存(5→0)');
await run('dySend()');ok(run('DYS.sent')=='fail'&&n()==0,'ミスの送信が全部失敗しても 0 のまま(圏外・通信遮断でミスを消せない)');
/* 4. 二重送信(「もう一度送る」)で2回数えない */
put({n:1,pend:'',won:0});play('2026-11-22',true,[OK,OK]);await run('dySend()');await run('dySend()');ok(n()==2,'同じ日のクリアは1回しか +1 しない');
/* 5. クリアしたのに送れない → 数えない・保留は残る → 送り直しで +1 */
put({n:7,pend:'',won:0});play('2026-11-23',true,[E0,E0,E0]);await run('dySend()');
ok(run('DYS.sent')=='fail'&&n()==7&&st().pend=='2026-11-23'&&st().won==1,'クリアでも送れなければ +1 しない(7のまま・保留)');
net([OK]);await run('dySend()');ok(n()==8&&st().pend=='','「もう一度送る」が通れば +1(7→8)');
/* 6. 409 の読み分け */
put({n:3,pend:'',won:0});play('2026-11-24',true,[E409]);await run('dySend()');ok(run('DYS.sent')=='rej'&&n()==0,'通信エラーなしの409(その日はもう終わっていた)=数えずミス扱い(3→0)');
put({n:3,pend:'',won:0});play('2026-11-25',true,[E0,E409]);await run('dySend()');ok(run('DYS.sent')=='unk'&&n()==4,'通信エラーのあとの409(1回目が届いていた)=クリアなので +1');
put({n:3,pend:'',won:0});play('2026-11-26',true,[E400]);await run('dySend()');ok(run('DYS.sent')=='rej'&&n()==0,'その他の4xx(日付範囲外など)=数えずミス扱い');
/* 7. タブを閉じて放置(保留が残ったまま次に開く) */
put({n:6,pend:'2026-11-27',won:0});run('dyAbandon()');ok(n()==0&&st().pend=='','始めて閉じた → 次に開いたとき 0(6→0)');
run('dyAbandon()');ok(n()==0,'何度呼んでも同じ');
put({n:6,pend:'2026-11-27',won:0});run('DY=1');run('dyAbandon()');ok(n()==6&&st().pend=='2026-11-27','いま遊んでいる最中は触らない');run('DY=0');
put({n:6,pend:'',won:0});run('dyAbandon()');ok(n()==6,'保留がなければ何も起きない(日が空いただけでは 0 にならない)');
/* 8. クリアを控えたまま閉じた(送信が届いたか分からない)→ 次に status が取れたとき */
put({n:6,pend:'2026-11-28',won:1});run("dyAbandon()");ok(st().pend=='2026-11-28'&&n()==6,'クリアを控えた保留は、開いただけでは決めない');
run("dySettle('2026-11-28','done')");ok(n()==7&&st().pend=='','同じ日で、サーバーが done → クリアとして +1');
put({n:6,pend:'2026-11-28',won:1});run("dySettle('2026-11-28','playing')");ok(n()==0,'サーバーが playing(終了が届いていない)→ ミス扱い');
put({n:6,pend:'2026-11-28',won:1});run("dySettle('2026-11-29','done')");ok(n()==0,'別の日になっても受け付けを確認できない → ミス扱い');
put({n:6,pend:'2026-11-28',won:0});run("dySettle('2026-11-28','done')");ok(n()==0,'クリアを控えていない保留は、done でも数えない');
/* 9. 別タブ: 片方が先にミス扱いにした日は、もう片方のクリアを数えない */
put({n:2,pend:'',won:0});run("dyStreakStart('2026-11-30')");run('dyAbandon()');run("dyStreakWon('2026-11-30')");run("dyStreakWin('2026-11-30')");ok(n()==0,'別タブがミス扱いにしたあとのクリアは数えない');
/* 10. 連勝が続く */
put({n:0,pend:'',won:0});for(const d of['2026-12-01','2026-12-03','2026-12-09']){play(d,true,[OK]);await run('dySend()')}ok(n()==3,'日を空けても 0→1→2→3 と増える');
play('2026-12-10',false,[OK]);await run('dySend()');ok(n()==0,'ミスで 0');play('2026-12-11',true,[OK]);await run('dySend()');ok(n()==1,'また 1 から');
console.log('STREAK OK')})();
