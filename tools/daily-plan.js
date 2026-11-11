/* デイリー盤面の抽選と生成(GitHub Actions 用。tools/daily-gen.js が core + rules と一緒に読み込む)。数値の調整は DAILY だけ。
   縛りなし(バニラ)にするかは、最初に DAILY.noneRate の確率で1回だけ決める(引き直しのたびに決めると、作りやすい縛りなしが残りやすくなって割合がずれる)。縛りありのときは 1〜「そのサイズ・爆弾数で併用できる最大数」から一様に抽選する。最大数は RULES の conflicts / excl / ok / mstep から毎回求めるので、ルールを足しても何も触らなくてよい。 */
const DAILY={
 sizeMin:7,sizeMax:12,     // 盤面の一辺(正方形)
 bombMin:.28,bombMax:.45,  // 爆弾率。チャレンジ(.30〜.40)より上限を少し増やした
 genSec:30,                // 1回の生成がこの秒数で見つからなければ、サイズ・爆弾数・縛りを全部引き直す
 noneRate:.1,              // 縛りなし(バニラ)の盤面になる確率(0〜1)。下げるほど縛りなしが減る。0なら出ない。デイリーと厳選で共通
 fallbackSec:300,          // 引き直しがこの秒数を超えたら、縛りなしの盤面に切り替える(0時に盤面が無い事態を避ける保険)
 giveUpSec:900,            // これを超えたら失敗として終了(workflow が失敗扱いになりメールが来る)
 maxCost:30               // 難易度の上限。盤面のどの手も「その手を決めるのに要る配置の通りの数」が16以下(solver の cost の盤面内の最大)。小さいほど易しい。Infinity=上限なし。実測では多くの盤面が9以下で、数百以上になる盤面(縛りの重ねすぎ・嘘つき・鏡の一部)だけが弾かれる
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
/* 生成。genSec 秒で見つからない/品質未達なら、全部引き直す。log には盤面の中身(コード・縛り)を出さない(公開リポジトリのログから翌日の盤面が漏れるため)。
   例外: 手元で set DAILY_DEBUG=1 をつけたときだけ、失敗した抽選(サイズ・爆弾数・縛り)を出す。調整用。workflow では付けない */
async function dailyMake(log){const t0=Date.now(),none=rnd()<DAILY.noneRate;
 for(let n=1;;n++){const el=(Date.now()-t0)/1000;if(el>DAILY.giveUpSec)throw Error('生成できませんでした('+n+'回)');
  const cfg=dailyPlan(none||el>DAILY.fallbackSec);let res=null;
  try{res=await gen(cfg,{qms:DAILY.genSec*1000,hard:DAILY.genSec*1000,maxCost:DAILY.maxCost})}catch(e){log('試行'+n+': エラー '+e.message)}
  if(res&&res.gf&&res.q)return{cfg,res,tries:n,sec:(Date.now()-t0)/1000};
  log('試行'+n+': '+(res?'品質未達':'見つからず')+' → 引き直し'+(typeof DAILY_DEBUG!='undefined'&&DAILY_DEBUG?' ['+cfg.R+'x'+cfg.C+' 爆弾'+cfg.M+' '+(cfg.ids.join('+')||'縛りなし')+']':''))}}
