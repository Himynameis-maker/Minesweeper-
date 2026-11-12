/* デイリー盤面の抽選と生成(GitHub Actions 用。tools/daily-gen.js が core + rules と一緒に読み込む)。数値の調整は DAILY だけ。
   時間の制限は giveUpSec(GitHub Actions の1回の実行に合わせた全体の上限)だけ。1回の抽選ごとの制限時間や、時間がたったら縛りなしに切り替える仕組みは持たない。
   そのかわり、絶対に見つからない抽選(厳しすぎる縛りの組み合わせなど)で全体の時間を使い切らないよう、1回の抽選で試す盤面の数(DAILY.tries。時間ではなく回数)で見切って引き直す。
   縛りなし(バニラ)にするかは、最初に DAILY.noneRate の確率で1回だけ決める(引き直しのたびに決めると、作りやすい縛りなしが残りやすくなって割合がずれる)。縛りありのときは 1〜「そのサイズ・爆弾数で併用できる最大数」から一様に抽選する。最大数は RULES の conflicts / excl / ok / mstep から毎回求めるので、ルールを足しても何も触らなくてよい。 */
const DAILY={
 sizeMin:7,sizeMax:12,     // 盤面の一辺(正方形)
 bombMin:.28,bombMax:.45,  // 爆弾率。チャレンジ(.30〜.40)より上限を少し増やした
 tries:1500,               // 1回の抽選(サイズ・爆弾数・縛り)で試す盤面の数。これだけ試して見つからなければ、全部引き直す(時間ではなく回数なので、機械が遅くても結果は変わらない)
 noneRate:.1,              // 縛りなし(バニラ)の盤面になる確率(0〜1)。下げるほど縛りなしが減る。0なら出ない。デイリーと厳選で共通
 giveUpSec:900,            // ★唯一の時間制限。これを超えたら失敗として終了(workflow が失敗扱いになりメールが来る)。daily.yml の timeout-minutes より短くしておく。0時に盤面が無い事態は、1時間おきの7回の実行が保険になる
 maxCost:30               // 難易度の上限。盤面のどの手も「その手を決めるのに要る配置の通りの数」が30以下(solver の cost の盤面内の最大)。小さいほど易しい。Infinity=上限なし。定番パターン([pat])で解ける手は cost 2。実測では多くの盤面が5以下で、数十〜数百以上になる盤面(縛りの重ねすぎ・嘘つき・鏡の一部)だけが弾かれる
};
const dShuf=a=>{for(let i=a.length-1;i>0;i--){const j=rnd()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const dOk=(R,C,M,cur,id)=>cur.every(x=>!conflict(RULES[x],RULES[id]))&&mok(R,C,M,[...cur,id]);
/* 併用できる縛りの最大数(分枝限定。cur に足して mok が偽になる枝は切る) */
function dailyMax(R,C,M,ids){let best=0;const cur=[];
 const rec=i=>{if(cur.length>best)best=cur.length;
  for(let j=i;j<ids.length;j++){if(cur.length+ids.length-j<=best)return;if(dOk(R,C,M,cur,ids[j])){cur.push(ids[j]);rec(j+1);cur.pop()}}};
 rec(0);return best}
/* ちょうど k 個の併用できる縛りをランダムに1組(無ければ null) */
function dailyFind(R,C,M,ids,k){const a=dShuf(ids.slice()),cur=[];
 const rec=i=>{if(cur.length==k)return true;
  for(let j=i;j<a.length;j++){if(cur.length+a.length-j<k)return false;if(dOk(R,C,M,cur,a[j])){cur.push(a[j]);if(rec(j+1))return true;cur.pop()}}return false};
 return rec(0)?cur:null}
function dailyPlan(noRules){const ri=(a,b)=>a+(rnd()*(b-a+1)|0),R=ri(DAILY.sizeMin,DAILY.sizeMax),C=R,N=R*C,
  M=Math.max(1,Math.min(N-12,Math.round(N*(DAILY.bombMin+rnd()*(DAILY.bombMax-DAILY.bombMin))))),
  ids=noRules?[]:Object.keys(RULES).filter(id=>mok(R,C,M,[id])),mx=noRules?0:dailyMax(R,C,M,ids);
 let k=ri(1,mx),set=noRules?[]:null; /* noRules=縛りなしにする。そうでなければ最低1つ(併用できる縛りが1つも無いときだけ0になる) */
 while(!set&&k>=0){set=dailyFind(R,C,M,ids,k);if(!set)k--}
 return{R,C,M,ids:set||[]}}
/* 生成。DAILY.tries 回試して見つからない/品質未達なら、全部引き直す(全体の時間は giveUpSec だけ)。log には盤面の中身(コード・縛り)を出さない(公開リポジトリのログから翌日の盤面が漏れるため)。
   例外: 手元で set DAILY_DEBUG=1 をつけたときだけ、失敗した抽選(サイズ・爆弾数・縛り)を出す。調整用。workflow では付けない */
async function dailyMake(log){const t0=Date.now(),none=rnd()<DAILY.noneRate;
 for(let n=1;;n++){const el=(Date.now()-t0)/1000;if(el>DAILY.giveUpSec)throw Error('生成できませんでした('+n+'回)');
  const cfg=dailyPlan(none);let res=null;
  try{res=await gen(cfg,{qms:Infinity,hard:(DAILY.giveUpSec-el)*1000,maxTries:DAILY.tries,maxCost:DAILY.maxCost})}catch(e){log('試行'+n+': エラー '+e.message)}
  if(res&&res.gf&&res.q)return{cfg,res,tries:n,sec:(Date.now()-t0)/1000};
  log('試行'+n+': '+(res?'品質未達':'見つからず')+' → 引き直し'+(typeof DAILY_DEBUG!='undefined'&&DAILY_DEBUG?' ['+cfg.R+'x'+cfg.C+' 爆弾'+cfg.M+' '+(cfg.ids.join('+')||'縛りなし')+']':''))}}
