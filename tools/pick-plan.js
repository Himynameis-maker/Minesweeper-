/* 厳選盤面の抽選と生成(GitHub Actions 用。tools/pick-gen.js が core + rules + daily-plan.js と一緒に読み込む)。
   作り方はデイリーと同じ(サイズ・爆弾率・縛りの抽選は daily-plan.js の dailyPlan、難易度の上限は DAILY.maxCost)。違いは「難易度の下限」だけ。
   縛りは多くても、四方向縛りだけ・縛りなし(バニラ)でも、「人間が解ける範囲で、場合分け(背理法)が要る」やりごたえのある盤面だけを採用する。数値の調整は PICK だけ。
   「場合分けが要る」かどうかは solver の物差しで測る。単一制約でも、定番パターン(二つの数字の組み合わせ。1-2の形・差を取る・残り爆弾数との見比べ)でも進めず、
   仮定(probe)か全列挙が要った回数が deep、その中で一番重い手の配置の数が maxc。定番パターンで解ける手は場合分けに数えない(=易しい盤面が下限を通らない)。
   時間の制限は giveUpSec(workflow の timeout-minutes に合わせた全体の上限)だけ。1回の抽選で試す盤面の数(tries。時間ではなく回数)で見切って引き直す。
   見つからなくても失敗にしない(null を返す)。厳選は「出なくてもよい」ので、workflow は何も送らずに正常終了する。 */
const PICK={
 giveUpSec:840,    // ★唯一の時間制限。これを超えたらあきらめる(workflow の timeout-minutes 20分より短く)
 tries:2000,       // 1回の抽選(サイズ・爆弾数・縛り)で試す盤面の数。これだけ試して見つからなければ、全部引き直す(時間ではなく回数)。縛りなしで場合分け2回の盤面は、約1000回で見つかる
 minCost:6,        // 下限1: 一番重い手が「6通り以上」(=少なくとも1回は、場合分けが要る)。上限は DAILY.maxCost
 minDeep:2,        // 下限2: 定番パターンでも進めず、場合分け(仮定か全列挙)が要る場面が2回以上。大きいほど歯ごたえが増えるが、見つかるまでの試行も増える
 minDep:.15        // 下限3: 縛りを外すと解けなくなるマスが、安全マスの15%以上(縛りが飾りでない)
};
/* 1つ作る。見つかれば {cfg,res,tries,sec,m:{maxc,deep,pats,rounds}}、あきらめたら null */
async function pickMake(log){const t0=Date.now(),none=rnd()<DAILY.noneRate; /* 縛りなしにするかは最初に1回だけ(確率は DAILY.noneRate。daily-plan.js) */
 for(let n=1;;n++){const el=(Date.now()-t0)/1000;if(el>PICK.giveUpSec){log('あきらめました('+(n-1)+'回)');return null}
  const cfg=dailyPlan(none);let res=null;
  try{res=await gen(cfg,{qms:Infinity,hard:(PICK.giveUpSec-el)*1000,maxTries:PICK.tries,maxCost:DAILY.maxCost,minCost:PICK.minCost,minDeep:PICK.minDeep,minDep:PICK.minDep})}catch(e){log('試行'+n+': エラー '+e.message)}
  if(res&&res.gf&&res.q){const s=sim(prep(cfg),cfg.M,res.mines,res.start,undefined,res.L);
   return{cfg,res,tries:n,sec:(Date.now()-t0)/1000,m:{maxc:s.maxc,deep:s.deep,pats:s.pats,rounds:s.rounds}}}
  log('試行'+n+': '+(res?'下限に届かず':'見つからず')+' → 引き直し ['+cfg.R+'x'+cfg.C+' 爆弾'+cfg.M+' '+(cfg.ids.join('+')||'縛りなし')+']')}}
