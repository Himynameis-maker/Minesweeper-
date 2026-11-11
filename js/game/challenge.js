/* [game/challenge] チャレンジの数値(CHALLENGE)・解説文・連勝記録・進行(run)・終了演出。
   数値をいじりたいときは CHALLENGE だけ触ればよい(開始画面の解説文もここの値から作られる)。 */
const CHALLENGE={
 title:tx('🔥 チャレンジ'),
 wins:3,                 // 何盤面を連続でクリアすれば達成か
 missResetsStreak:false, // false=累計(ミスしてもクリア数は残る) / true=ミスすると連続クリア数が0に戻る
 lives:2,                // ミスできる回数(挑戦全体の合計)
 hints:5,                // ヒント回数(1盤面ごと。次の盤面で回復)
 sizeMin:6,sizeMax:9,    // 盤面の一辺
 square:true,            // true=縦横同じ(6x6〜8x8) / false=縦横それぞれ別に抽選
 bombMin:.30,bombMax:.40,// 爆弾率(縛りに合わなければ前後どちらかにずれる)
 rulesMin:1,rulesMax:3,  // 縛りの数
 regenSec:10,            // 生成がこの秒数を超えたら「引き直す」ボタンを出す
 endDelayMs:1100,        // 最後の盤面を見せてから終了演出を出すまでの時間
 storeKey:'msv.winStreak'// ブラウザに保存するキー(ウィンストリーク)
};
/* ---- ウィンストリーク(チャレンジ達成の連続回数)。ブラウザに保存 ---- */
const chStreak=()=>{try{return Math.max(0,parseInt(localStorage.getItem(CHALLENGE.storeKey))||0)}catch(e){return 0}};
const chSaveStreak=n=>{try{localStorage.setItem(CHALLENGE.storeKey,String(n))}catch(e){}};
/* ---- 開始画面の解説(ややカジュアル)。数値は CHALLENGE から ---- */
function chDescHtml(){const c=CHALLENGE,pc=x=>Math.round(x*100),rg=(a,b)=>a==b?''+a:a+tx('〜')+b,
 sz=c.square?c.sizeMin+'×'+c.sizeMin+(c.sizeMin==c.sizeMax?'':tx('〜')+c.sizeMax+'×'+c.sizeMax):tx('縦横それぞれ{r}マス',{r:rg(c.sizeMin,c.sizeMax)});
 return[
  tx('縛り・盤面・爆弾数はぜんぶランダム。'),
  tx('盤面は{sz}、爆弾は{b}%くらい、縛りは{r}個。縛りに合わない爆弾数のときは、その限りでない。',{sz,b:rg(pc(c.bombMin),pc(c.bombMax)),r:rg(c.rulesMin,c.rulesMax)}),
  c.missResetsStreak?tx('{w}盤面を連続でクリアできたら勝ち! ミスすると連続記録はリセットされる。',{w:c.wins}):tx('合計{w}盤面クリアできたら勝ち!',{w:c.wins}),
  tx('ミスは全部で{m}回までOK。ヒントは1盤面ごとに{h}回まで使えるよ。',{m:c.lives-1,h:c.hints}),
  tx('クリアしてもミスしても次の盤面へ。'),
  tx('盤面づくりが{s}秒を超えたら、「引き直す」ボタンが出るよ。',{s:c.regenSec})
 ].map(t=>'<p>'+t+'</p>').join('')}
function chSetup(){$('#cht').innerHTML=pxi(CHALLENGE.title);$('#chd').innerHTML=chDescHtml();$('#chw').innerHTML=tx('🏆 ウィンストリーク <b>{n}</b>',{n:chStreak()})}
/* ---- 進行 run={streak,lives,hints,X,stage,total,prev,end} (streak/lives/hints/X は board.js のチップも参照する名前なので変えない) ---- */
function chNewRun(){run={streak:0,lives:CHALLENGE.lives,hints:CHALLENGE.hints,X:CHALLENGE.wins,stage:0,total:0,prev:chStreak(),end:''}}
function chNewBoard(){run.stage++;run.hints=CHALLENGE.hints}
function chMiss(){hm=0;run.lives--;if(CHALLENGE.missResetsStreak)run.streak=0;
 if(run.lives<=0){run.end='lose';chSaveStreak(0);msg(tx('💥 ミス! ライフがなくなっちゃった…'))}
 else msg(tx(CHALLENGE.missResetsStreak?'💥 ミス! 残りライフ {n}(連続クリアはリセット)':'💥 ミス! 残りライフ {n}',{n:run.lives}));
 chSchedule()}
function chClear(){hm=0;run.streak++;run.total++;
 if(run.streak>=run.X){run.end='win';chSaveStreak(chStreak()+1);msg(tx('🎉 {n}盤面クリア! チャレンジ達成!',{n:run.X}))}
 else msg(tx('✨ クリア! ({a}/{b})',{a:run.streak,b:run.X}));
 chSchedule()}
/* 終了(達成/ゲームオーバー)なら、最後の盤面を少し見せてから演出を出す */
function chSchedule(){if(!run.end)return;const r=run;setTimeout(()=>{if(run===r&&!$('#game').hidden)chEnd()},CHALLENGE.endDelayMs)}
/* ---- 終了演出 ---- */
function chFx(win){const e=win?['🎉','✨','🎊','⭐','🏆']:['💣','💥','💨'];let h='';
 for(let k=0;k<(win?28:14);k++)h+='<span class="pc" style="left:'+(rnd()*100|0)+'%;font-size:'+(16+rnd()*18|0)+'px;animation-duration:'+(2.2+rnd()*2.2).toFixed(1)+'s;animation-delay:'+(rnd()*1.2).toFixed(1)+'s">'+e[rnd()*e.length|0]+'</span>';
 $('#finx').innerHTML=h}
function chEnd(){const win=run.end=='win',st=chStreak();
 $('#fin').className=win?'win':'lose';$('#fini').textContent=win?'🏆':'💥';
 $('#fint').textContent=tx(win?'チャレンジ達成!':'ゲームオーバー');
 $('#find').textContent=win?tx('おみごと! {n}盤面を乗りきったよ。',{n:run.X}):run.prev>0?tx('{n}連勝がストップしちゃった…。もう一回いく?',{n:run.prev}):tx('ライフがなくなっちゃった。もう一回いく?');
 $('#fins').innerHTML='<span class="chip">'+tx('クリア {n}盤面',{n:run.total})+'</span><span class="chip">'+tx('挑戦 {n}盤面',{n:run.stage})+'</span><span class="chip">'+tx('🏆 ウィンストリーク <b>{n}</b>',{n:st})+'</span>';
 chFx(win);cpFin(1);$('#fin').hidden=false}
function chLeave(){$('#fin').hidden=true;chSetup();show('setup')}
