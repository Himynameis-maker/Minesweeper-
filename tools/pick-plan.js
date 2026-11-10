/* 厳選盤面の抽選と生成(GitHub Actions 用。tools/pick-gen.js が core + rules + daily-plan.js と一緒に読み込む)。
   作り方はデイリーと同じ(サイズ・爆弾率・縛りの抽選は daily-plan.js の dailyPlan、難易度の上限は DAILY.maxCost)。違いは「難易度の下限」だけ。
   縛りは多くても、四方向縛りだけ・縛りなし(バニラ)でも、「人間が解ける範囲で、場合分け(背理法)が要る」やりごたえのある盤面だけを採用する。数値の調整は PICK だけ。
   見つからなくても失敗にしない(null を返す)。厳選は「出なくてもよい」ので、workflow は何も送らずに正常終了する。 */
const PICK={
 genSec:30,        // 1回の生成がこの秒数で見つからなければ、サイズ・爆弾数・縛りを全部引き直す
 giveUpSec:840,    // これを超えたらあきらめる(workflow の timeout-minutes 20分より短く)
 minCost:6,        // 下限1: 一番重い手が「6通り以上」(=少なくとも1回は、場合分けが要る)。上限は DAILY.maxCost(16)
 minDeep:3,        // 下限2: 単一制約で進めず、全列挙が要る場面(詰まる回数)が3回以上
 minDep:.15        // 下限3: 縛りを外すと解けなくなるマスが、安全マスの15%以上(縛りが飾りでない)
};
/* 1つ作る。見つかれば {cfg,res,tries,sec,m:{maxc,deep,rounds}}、あきらめたら null */
async function pickMake(log){const t0=Date.now();
 for(let n=1;;n++){const el=(Date.now()-t0)/1000;if(el>PICK.giveUpSec){log('あきらめました('+(n-1)+'回)');return null}
  const cfg=dailyPlan(false);let res=null;
  try{res=await gen(cfg,{qms:PICK.genSec*1000,hard:PICK.genSec*1000,maxCost:DAILY.maxCost,minCost:PICK.minCost,minDeep:PICK.minDeep,minDep:PICK.minDep})}catch(e){log('試行'+n+': エラー '+e.message)}
  if(res&&res.gf&&res.q){const s=sim(prep(cfg),cfg.M,res.mines,res.start,undefined,res.L);
   return{cfg,res,tries:n,sec:(Date.now()-t0)/1000,m:{maxc:s.maxc,deep:s.deep,rounds:s.rounds}}}
  log('試行'+n+': '+(res?'下限に届かず':'見つからず')+' → 引き直し ['+cfg.R+'x'+cfg.C+' 爆弾'+cfg.M+' '+(cfg.ids.join('+')||'縛りなし')+']')}}
