/* 厳選盤面の抽選と生成(GitHub Actions 用。tools/pick-gen.js が core + rules + daily-plan.js と一緒に読み込む)。
   作り方はデイリーと同じ(サイズ・爆弾率・縛りの抽選は daily-plan.js の dailyPlan、難易度の上限は DAILY.maxCost)。違いは「難易度の下限を別の変数(PICK.minCost/minDeep/minDep)で持つ」ことと「見つからなくても失敗にしない」こと。時間(giveUpSec/tries/drawSec)もデイリーとは別の変数。
   縛りは多くても、四方向縛りだけ・縛りなし(バニラ)でも、「人間が解ける範囲で、場合分け(背理法)が要る」やりごたえのある盤面だけを採用する。数値の調整は PICK だけ。
   「場合分けが要る」かどうかは solver の物差しで測る。単一制約でも、定番パターン(二つの数字の組み合わせ。1-2の形・差を取る・残り爆弾数との見比べ)でも進めず、
   仮定(probe)か全列挙が要った回数が deep、その中で一番重い手の配置の数が maxc。定番パターンで解ける手は場合分けに数えない(=易しい盤面が下限を通らない)。
   全体の時間の上限は giveUpSec(workflow の timeout-minutes に合わせた上限)。1回の抽選は「試す盤面の数(tries。回数)」と「かける時間(drawSec。秒)」のどちらか先に来た方で見切って引き直す。
   見つからなくても失敗にしない(null を返す)。厳選は「出なくてもよい」ので、workflow は何も送らずに正常終了する。 */
const PICK={
 giveUpSec:840,    // ★唯一の時間制限。これを超えたらあきらめる(workflow の timeout-minutes 20分より短く)
 tries:1500,       // 1回の抽選(サイズ・爆弾数・縛り)で試す盤面の数の上限(回数)。drawSec とどちらか先に来た方で見切って、全部引き直す。縛りなしで場合分け2回の盤面は、約1000回(約35秒)で見つかる
 drawSec:60,       // 1回の抽選にかける時間の上限(秒)。tries とどちらか先に来た方で見切る。縛りなしが約35秒で見つかるので、遅い日でも届くよう2〜3倍の余裕を見ている。0 や Infinity にすると時間では切らない(回数だけ)
 minCost:8,        // 下限1(厳選盤面だけの値。デイリーは DAILY.minCost): 一番重い手が「6通り以上」(=少なくとも1回は、場合分けが要る)。上限は DAILY.maxCost。0 で下限なし
 minDeep:4,        // 下限2: 定番パターンでも進めず、場合分け(仮定か全列挙)が要る場面が2回以上。大きいほど歯ごたえが増えるが、見つかるまでの試行も増える。0 で下限なし
 minDep:.15        // 下限3: 縛りを外すと解けなくなるマスが、安全マスの15%以上(縛りが飾りでない)。0 で下限なし
};
/* 1つ作る。見つかれば {cfg,res,tries,sec,m:{maxc,deep,pats,rounds}}、あきらめたら null */
async function pickMake(log){const t0=Date.now(),none=rnd()<DAILY.noneRate; /* 縛りなしにするかは最初に1回だけ(確率は DAILY.noneRate。daily-plan.js) */
 for(let n=1;;n++){const el=(Date.now()-t0)/1000;if(el>PICK.giveUpSec){log('あきらめました('+(n-1)+'回)');return null}
  const cfg=dailyPlan(none);let res=null;
  try{res=await gen(cfg,{qms:Infinity,hard:Math.min(PICK.giveUpSec-el,PICK.drawSec>0?PICK.drawSec:Infinity)*1000,maxTries:PICK.tries,maxCost:DAILY.maxCost,minCost:PICK.minCost,minDeep:PICK.minDeep,minDep:PICK.minDep})}catch(e){log('試行'+n+': エラー '+e.message)}
  if(res&&res.gf&&res.q){const s=sim(prep(cfg),cfg.M,res.mines,res.start,undefined,res.L);
   return{cfg,res,tries:n,sec:(Date.now()-t0)/1000,m:{maxc:s.maxc,deep:s.deep,pats:s.pats,rounds:s.rounds}}}
  log('試行'+n+': '+(res?'下限に届かず':'見つからず')+' → 引き直し ['+cfg.R+'x'+cfg.C+' 爆弾'+cfg.M+' '+(cfg.ids.join('+')||'縛りなし')+']')}}
