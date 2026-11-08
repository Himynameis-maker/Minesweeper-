# Minesweeper Variants — context.md

> 新しいチャットのAIへ: まずこのファイルを全部読む。**プロジェクト全体は不要**。第3節の表で「今回の作業に必要なファイル」だけをユーザーに頼む。

## 0. あなたの役割と出力ルール

- 役割: マインスイーパーの「縛り(ルール)」の追加・修正・併用矛盾の解消担当。必要なら CORE(推論/生成)も拡張する。
- ユーザーは日本語話者で、**コードは書けない/読めない**。専門用語・コマンドは避け、手順は「GitHub の画面でこのファイルを開く→鉛筆→ここを直す→Commit」のように1手ずつ。ファイルを渡すときは変更ファイルを丸ごと(置換位置の指示だけにしない)。簡潔に。案が複数あるなら短く列挙して選んでもらう。
- **渡されていないファイルは推測で書かない。** 必要なら「◯◯を渡してください」と先に言う。
- 出力は「変更・新規ファイルの全文」+「CHANGELOG.md に足す1行」+「併用NGを conflicts に入れた旨」。大きいファイル(solver.js / gen.js)だけは「置換前→置換後」の差分でもよい。
- 新ルールが **CORE拡張を要する** なら、作る前にユーザーに確認する(判定は第7節の表)。
- コードが実行できる環境なら、出力前に必ず検証する(第8節)。できないなら、ユーザーに「検査レポート」を貼ってもらう。

## 1. ゲーム概要

- 単一HTML のマインスイーパー・バリアント。「縛り」をランダムに/選んで攻略する。縛りは AI が少しずつ増やす。
- 最重要: **ノーゲス(運ゲー無し)盤面だけを出す**。開始マスは自動オープンし、推論だけで完走できる配置のみ採用。かつ単調でない(推論の種類>=2、手順3段以上、各縛りを外すと解けなくなる=飾りでない)。
- フリープレイ: 盤面/爆弾数/縛りを自由指定、ミス=即終了。盤面サイズは入力1つ「盤面の縦と横の長さ」(`#S`。3〜24)で常に正方形。内部の `cfg` は R と C を別々に持ち、同じ値を入れる(`config.js` の `plan` / `freeCfg`)。縛りが今の盤面・爆弾数に合わないとスタートを止める。
- チャレンジ: **設定画面なしの完全ランダム**(プレイヤーは何も変えられない)。盤面・爆弾率・縛りの数を抽選し、縛りは全ルールから抽選。爆弾数が縛りに合わなければ前後どちらか(ランダム)へずらし、合わなくなった縛りは外す。`CHALLENGE.wins`(既定3)盤面クリアで達成(`missResetsStreak` が false なら累計、true なら連続=ミスで0に戻る)。ミスは挑戦全体で `lives` 回まで、ヒントは**1盤面ごと** `hints` 回(次の盤面で回復)。クリアでもミスでも次の盤面へ(ミスした盤面はフリープレイ同様に全開示)。生成が `regenSec` 秒を超えると「引き直す」ボタン(縛り等を再抽選。盤面番号は進まない)。達成/ゲームオーバーで演出(#fin)。ウィンストリーク(チャレンジ達成の連続回数)を localStorage に保存し、開始画面に出す(ゲームオーバーで0)。**数値・文言の調整は `js/game/challenge.js` の `CHALLENGE` だけ**(開始画面の解説文も `chDescHtml` がここの値から作る)。
- ヒント: ON/OFF式。ON中に数字・縛り・残り爆弾数をタップすると、その手がかりから確定できるマスがあるかだけ答える(場所は教えない)。
- 操作: モードは「開ける/旗/マーク」(`fm`=0/1/2)。マークは旗の色違いのメモで、残り爆弾数とヒント推論には影響しない(旗だけが「既知の爆弾」扱い)。同じ印をもう一度立てると外れ、別の印は置き換え。旗/マークの立っているマスは開けない。右クリックは選択中の印を立てる(開けるモード中は旗)。

## 2. ファイル構成

読み込み順 = 依存順。**`<script src>` の一覧は index.html が唯一の正**(build.py / tools もこれを読む)。クラシックスクリプトでグローバル共有(ES modules は file:// で動かないので使わない)。

```
index.html            画面のHTML骨格 + script読み込み順 (RULES:BEGIN〜END は build.py が自動同期)
build.py              全部インライン化 → dist/minesweeper-variants.html (python3 build.py)
context.md            ← これ。CHANGELOG.md = 変更履歴。README.md = 人間向け手順
css/style.css         見た目のみ (チャレンジの解説・終了演出を含む)
js/core/              推論と生成。DOM非依存(node でも動く)
  util.js             rnd, D8/D4/KN, offs, gcd (0.5KB)
  registry.js         RULES, reg, conflict, stepOf/mfit/mok/mnear/mpick (2.1KB)
  prep.js             prep(cfg)→P(問題定義), gcomps (2KB)
  solver.js           deduce(確定推論エンジン), sim(解き進めシミュ) (11KB)  ★全体制約の主戦場。[probe]=仮定して矛盾を探す推論
  gen.js              gen(ノーゲス盤面の生成・山登り・品質判定) (15KB)   ★配置様式の主戦場。下限つき cons 用は lsample/smove
  selftest.js         selfTest(単体+併用ペア検査), buildReport (2.1KB)
js/game/              盤面の進行(DOMを読み書きする)
  state.js            グローバル状態 G/run/SEL..., $ v chk mode msg show (0.7KB)
  challenge.js        チャレンジ: CHALLENGE(数値の唯一の置き場), 解説文 chDescHtml, ウィンストリーク保存, run の進行 chNewRun/chNewBoard/chMiss/chClear, 終了演出 chEnd (5.3KB)
  config.js           設定→cfg: norm, pick, plan, chPlan(チャレンジ抽選), freeCfg, problems (3.1KB)。フリープレイの盤面サイズは `v('S')` 1つから R=C を作る
  play.js             start(gen呼び出し。nr=新挑戦, again=引き直し), flood, act, hscan, ask(ヒント) (4.5KB)
js/ui/                描画と配線
  board.js            draw (チャレンジ中は ✅クリア X/N・第N盤面・❤・💡 のチップ、「次の盤面」ボタンの出し分けもここ) (2.6KB)
  modal.js            縛りモーダル, tags(縛りのタグ), 例盤面 mini/exHtml, longpress (5.4KB)
  main.js             upd, setMode, 検査レポート欄, 全イベント配線(load) (3.3KB)
rules/                1ルール=1ファイル(ファイル名=id)。_始まりは読み込まれない
  _template.js        ひな形 (reg の全フック一覧つき)
  noTouch cross crossScan knight lines liar liar2 groupBomb rect noIsolate allConnected colorDouble tidy dragon twinDragon .js
tools/
  headless.js         ブラウザ無しで検査: node tools/headless.js [id...] | --combo a,b,c
  smoke-ui.js         偽DOMでUI一式+チャレンジの通し(抽選範囲/ヒント/ミス/達成/ゲームオーバー/引き直し/ウィンストリーク)を動かす: node tools/smoke-ui.js
  daily-plan.js       デイリー盤面の抽選と生成。数値の調整は先頭の DAILY だけ(盤面サイズ・爆弾率・生成の制限時間)
  daily-gen.js        daily-plan を core+rules と読み込み、盤面コードを JSON に書く: node tools/daily-gen.js payload.json YYYY-MM-DD (workflow が使う)
  daily-e2e.js        デイリーの通しテスト(偽D1+偽DOM。functions/ の本物を動かす): node tools/daily-e2e.js (Node 22.5+)
js/ui/daily.js        デイリー画面(スタート/3,2,1/タイマー/結果/ランキング/盤面入手)。サーバーとの通信もここ
js/core/boardcode.js  盤面コードの符号化(boardEncode/boardDecode)。js/core/boardver.js = ルールセット番号 BOARD_VER
functions/            Cloudflare Pages Functions(デイリーのサーバー側)。★ファイル名がそのままURLになる。_lib.js=共通, ping.js=動作確認, api/daily/{status,start,finish,code,ranking}.js, api/admin/board.js
schema.sql            D1(SQLite)のテーブル定義。Cloudflare の D1 → Console に貼って1回実行
.github/workflows/daily.yml   毎日の盤面作りの自動実行(GitHub Actions)
DAILY.md              ★ユーザー向けのデイリー管理ガイド(非エンジニア向け)。仕様を変えたらここも直す
```

`P`(prep の結果): `{nb[i]=数字が数えるマス, cons=[{cells,lo,hi,src}], grp, gid, adj(上下左右), iso, iid, imax(iso の塊サイズ上限。0=上限なし), conn, cnid, adj8(8近傍。iso か conn のときだけ), R, C, lie(0=なし/1=各行列に正直1つ/2=各行列に嘘1つ), lid, w, probe/pid(probe推論を使うルールの有無とid), dragon/did(龍の有無とid。1=龍, 2=双竜。双竜のときは adj8 も載る)}`。
`run`(チャレンジ進行。フリープレイは null): `{streak(クリア数。board.js が読む), lives, hints(この盤面の残り), X(目標盤面数), stage(今の盤面番号), total(挑戦中の累計クリア), prev(挑戦開始時のウィンストリーク), end(''|'win'|'lose')}`。
`G`(盤面状態, game): `{cfg,P,N,mines,act(実際の数),num(表示数字),st(0未開/1開/2爆発),fl(0なし/1旗/2マーク。真偽値として扱わず fl[i]==1 のように書く),rev,over,done,hint}`。

## 3. タスク別「渡すファイル」(コスト削減の要)

| やりたいこと | ユーザーに頼むファイル |
|---|---|
| 新ルールを足す(cons / nb / ok / mstep で書ける) | `context.md` + `rules/_template.js`。似たルールがあればそのファイル1つ |
| 既存ルールの修正 | `context.md` + `rules/<id>.js` |
| 併用の矛盾を直す(検査レポートに NG が出た) | `context.md` + 検査レポート + 関係する `rules/<a>.js` `rules/<b>.js` |
| 生成が遅い/失敗する(特定の縛り) | 上に加えて `js/core/gen.js` |
| CORE拡張(新しい種類の制約・数字の意味変更。第7節) | `context.md` + `js/core/{prep,solver,gen}.js` + 対象ルール。例盤面の見せ方も変えるなら `js/ui/modal.js` |
| チャレンジの数値・解説文・演出の調整 | `context.md` + `js/game/challenge.js` だけ(抽選の中身を変えるなら `js/game/config.js` の `chPlan` も) |
| UIの見た目・操作の変更 | `context.md` + `index.html` + `css/style.css` + 該当の `js/ui/*.js` `js/game/*.js` |
| デイリーの不具合(サーバー機能・登録・準備中など) | `context.md` + 症状(画面のメッセージ / `/ping` の表示 / Actions の赤い行)。コードは `functions/` `.github/workflows/daily.yml` `js/ui/daily.js` |
| デイリーの盤面(大きさ・爆弾率・生成) | `context.md` + `tools/daily-plan.js` |
| 配布用の単一HTMLが欲しい | プロジェクト全体 → `python3 build.py` の結果 `dist/minesweeper-variants.html` |

ルールを足すだけなら **CORE・UI・CSS は一切不要**。新規ファイル1つ(+ CHANGELOG 1行)で完結する。

## 4. ルール定義 (rules/<id>.js に reg を1つ)

```js
reg({id:"camelCase一意", name:"表示名(短く)", desc:"説明を1行で",
 excl:"num",                        // 任意: 数字の定義を変えるルールは "num"(同じexclは併用不可)
 conflicts:["otherId"],             // 任意: 併用不可の相手(片側だけの宣言で双方向に効く)
 ok:c=>c.M>=c.R,                    // 任意: 適用条件 c={R,C,M}。偽なら選ばれない/外される(フリープレイでは開始を止める)
 why:"縦と横が同じ盤面のみ",         // 任意: okが盤面の形など爆弾数では直らない理由のときに画面に出す文
 mstep:2,                           // 任意: 爆弾数がこの倍数(2以上の整数。grpがあれば自動で grp の倍数)
 nb:(R,C,i)=>offs(R,C,i,D8),        // 任意: マスiの数字が数えるマス(省略=D8)
 cons:(R,C)=>[{cells:[0,1],lo:0,hi:1}], // 任意: 常に成り立つ制約。cells内の爆弾数は lo 以上 hi 以下
 wt:(R,C,i)=>1,                    // 任意: マスiの爆弾が数字に数えられる個数(重み。色つきマスは2など。爆弾の総数は変わらない。同時に1つだけ)
 liar:true,                         // 任意: 数字が実際と±1ズレる(各行・各列に正直な数字が1つ。縦横同じ盤面のみ。同時に1つだけ)
 liar:2,                            // 任意: liar の逆版。各行・各列に嘘の数字が1つだけ(嘘は実際と±1ズレ)、ほかは全部正直。true か 2 のどちらか1つ(liar と liar2 は併用不可)
 grp:4,                             // 任意: 爆弾の縦横連結成分が全てちょうどこの個数(同時に1つだけ)
 iso:true,                          // 任意: どの爆弾も8近傍に別の爆弾がある(孤立禁止。nb に関係なく常に8近傍)
 iso:4,                             // 任意: iso の数値版。8近傍でつながった塊が全て2〜n個(nは3以上の整数)で、塊同士は触れない。true か数値のどちらか1つ
 conn:true,                         // 任意: 全ての爆弾が8近傍でひと続き(手繋ぎ。nb に関係なく常に8近傍)
 probe:true                         // 任意: cons が重なって全列挙が打ち切られるルール(tidy)で、仮定して矛盾を探す推論を solver が使う
 dragon:true                        // 任意: 左端から右端まで、爆弾が1列ごとに同じ行か上下1行ずれでつながる列(龍)が必ずある(同時に1つだけ)
 dragon:2                           // 任意: dragon の2体版(双竜)。左右の龍H+上下の龍V。龍に8近傍で触れる爆弾は必ず龍の一部。dragon:true と同時には使えない(registry の conflict が dragon 同士を併用不可にする)。registry の reg は dragon に true か 2 だけを許す
});
```

- `cons` は盤面サイズ(R,C)だけから決まる静的制約。配置は必ず全 cons を満たし、ソルバも同じ制約で推論する。
- `nb` を持つルールは同時に1つだけ(`excl:"num"` で防ぐ)。`grp` / `liar`(`liar:true` と `liar:2` を合わせて)も同様に1つだけ(conflict が自動で防ぐ)。
- `grp` は「爆弾を縦横につながった grp 個ずつの組にし、組同士は縦横で触れない」。縦横に爆弾が隣り合うのを禁じる縛りとは `conflicts` にする。
- `liar` は nb(十字/ナイト)や cons 系と併用できる。`liar:2`(liar2。嘘つき数字2)も同じ。実装は liar と共通で、違いは「各行・各列に1つだけの特別マス」が正直(liar)か嘘(liar2)かだけ(solver の `LV`、gen の `hon[]` の解釈。第7節)。
- フリープレイは常に正方形なので、liar 系の「縦と横が同じ盤面のみ」で止まることはない(チャレンジで縦横が違う盤面になるかは `CHALLENGE.square` 次第)。
- liar 系と `wt` は併用不可。registry の `conflict` が `wt`×`liar`(`liar:true`/`liar:2` どちらも)を常に併用不可にするので、wt 側で `conflicts` を書かなくてよい(colorDouble の `conflicts:['liar']` は重複だが残してよい)。
- `wt` は nb(十字/ナイト)と併用できる。`wt` 同士は併用不可(conflict が自動で防ぐ)。liar / liar2 は「±1ズレ」の前提が個数なので併用不可(registry の `conflict` が自動で防ぐ。colorDouble の `conflicts:['liar']` は重複)。
- `iso` は「爆弾があるマスだけに課す条件つき制約」なので cons では書けない。nb / cons / liar と併用できる。`iso:true` は grp とは併用不可(組の中が必ずつながるので飾りになる。`conflicts` で防ぐ)。
- `iso:n`(例: noIsolate の `iso:4`)は、塊を「爆弾の8近傍連結成分」で決め、全ての塊が2〜n個。「塊同士が触れない」は定義から自動で成り立つので別に書かない(触れたら同じ塊)。grp とは併用不可(組の斜め接触も禁止になるが gsample/gmove が未対応。要望があれば `adj` を `adj8` にして対応可)、conn とは併用不可(全体が1塊になり爆弾数が n 個以下に限られる)。爆弾が盤面の約4.5割を超えると生成が極端に遅いので、ルール側の `ok` で上限を付ける。
- `conn` も cons では書けない全体制約。nb / cons / liar / grp と併用できる。iso:true(飾りになる)・iso:n(爆弾数が n 個以下に限られる)・rect(成り立たない)とは併用不可。
- cons だけで書ける形の例: rect(爆弾は1x1〜1x4の直線、斜めにも触れない)は「2x2 の枠は2個以下」「2x2 の対角は同時に爆弾にならない」「横5・縦5の窓は4個以下」だけで書ける(全部 hi のみ。下限なしなので第9節の生成制限を受けない)。
- **下限(lo>0)つき cons**(tidy など)は gen.js の `lsample`(爆弾を撒いて違反を min-conflicts で直す)と `smove`(valid を保つ swap)で生成する。ただし grp / iso / conn と併用すると各専用サンプラが優先され、下限は見ない(tidy が groupBomb / noIsolate / allConnected と `conflicts` なのはこのため)。
- **開始マスの安全領域に注意**: 開始マスは数字0(周囲を自動で開く)なので、nb が数えるマスは全部安全になる。この安全領域が下限つき cons に反する開始マスは使えない。「全ての2x2に爆弾1個以上」は D8 では開始マスをどこに選んでも不可能。tidy の旧3連版(縦横3連に爆弾1〜2個)は四隅だけが開始マスだった。現行の4連版(縦横4連に爆弾1〜3個)は D8 の安全領域(最大3x3、一直線に最大3マス)が4連に収まらないので、四隅に限らない可能性が高い【未確認】。逆に、安全領域が一直線に4マス以上並ぶ nb(十字の腕が2マスのもの等)は4連に反する(tidy.js が `conflicts` に挙げる crossScan はこの形)。`cross`(D4。腕は1マスで安全領域は一直線に3マスまで)は4連に反しない見込みで、tidy.js も `conflicts` に入れていない。併用の生成は、検査で1回失敗・次の検査では失敗なし(2026-11-06)で、偶然の可能性があり未確定。`crossScan`(十字探知。上下左右2マスまでの8マスを数える nb。`excl:'num'` なので cross / knight とも併用不可)は `cross.js` とは別のルール。下限つき cons を書くときは、安全領域が入っても成り立つ形か先に考える。
- **`probe:true`**(第9節): 重なる cons が盤面全体を1成分にして、solver の全列挙(3万ノード上限)が推論を諦める場合に宣言する。solver は単一制約の推論が空のとき、全列挙より前に、未確定マスを爆弾/安全と仮定して全制約(数字・cons・残り爆弾数)の単純な伝播で矛盾を探す(tier2、kinds に `2x`)。見つかれば全列挙は飛ばす。見つからないときの全列挙は、ノード上限を3万→500に下げて早く諦める(諦めても sound)。skip されるルール自身のときは無効(「外すと詰む」検査のため)。
- registry.js(2026-11-07): `reg` の検査は `dragon` を true か 2 に、`conflict` は dragon 同士(true と 2 を含む)を常に併用不可に変更した(twinDragon 用。`dragon:2` を通すため)。
- `dragon` は「爆弾の列が左端の列から右端の列まで、1列ごとに行が同じか±1でつながって存在する」全体制約(存在制約なので cons では書けない)。龍以外の爆弾は自由で、龍に触れていてもよい。nb / cons / liar と併用できる。groupBomb / noIsolate / noTouch / rect は論理的に両立しない、allConnected は生成が難航するので `conflicts`(dragon.js)。爆弾数は C 個以上(龍の最短長)で、`ok` で盤面の4割までに制限(自前検査で 9x9 の M=36(44%)は品質未達、M=32 までは品質OK)。
- 良いルール: cons/grp を持つルールは「外すと解けなくなる」盤面だけが採用される(飾りにならない)。外しても解けるのが普通になる弱すぎる制約は生成が難航する。説明は1行でプレイヤーが理解できること。
- 爆弾数に条件があるなら `ok` / `mstep` を書く(合わないとき前後の近い爆弾数が自動表示される。`why` は爆弾数では直らない理由のときだけ)。

## 5. 座標とヘルパー

- 盤面は R行×C列。マス番号 `i=r*C+c`(0始まり)。`r=floor(i/C)`, `c=i%C`。
- `offs(R,C,i,オフセット配列)`: i から [dr,dc] ずらした盤内マスの番号配列。定数 `D8`(8近傍) `D4`(上下左右) `KN`(桂馬)。
- 数字 = そのマスの `nb` が指すマスの爆弾数。数字0のマスは周囲(nb)を自動で開く。

## 6. 不変条件(壊さない)

- ソルバは **sound**(確定は必ず真)。`sim` が真の配置と食い違えば bug として例外('solver unsound')。
- 全体制約(grp/liar)の推論は **必要条件のみ**(楽観側)で枝刈りする。十分条件を足して sound を壊さない。
- ノーゲスでない盤面は絶対に出さない。`gen` は非同期・キャンセル可。見つからなければ null で失敗(妥協盤面を出さない)。
- 1ルール=1ファイル=1回の reg。他のルールや CORE に触らない(CORE拡張を頼まれたときを除く)。
- 推論は単一制約+組合せ(各成分3万ノード上限、超過時は推論せず=安全側)。
- ルールの意味(nb/cons/推論/生成)を変えたら `js/core/boardver.js` の BOARD_VER を +1 し、ユーザーに「今日と明日の盤面を force で作り直す」手順(DAILY.md の A)を案内する。ルールを足すだけなら上げない。
- `functions/` に置くファイルは、ファイル名がURLになる。空白・`(1)`・`.js` 以外を作らない(`tools/daily-e2e.js` が検査)。新しいAPIを足したら e2e のルート一覧にも足す。
- 画面のカウント秒数は `js/ui/daily.js` の `DAILY_UI.cdMs` と `functions/_lib.js` の `CD_MS` の **2か所** を必ず同じ値にする。
- Actions のログ(公開される)に、翌日の盤面コード・縛りを出さない。

## 7. CORE拡張の判定と、触る場所

**判定表**(ユーザーのアイデア → 必要なもの):

| アイデア | 必要なもの |
|---|---|
| 行・列・ブロックの個数 / 隣接禁止 | `cons` だけ。下限つきは lsample/smove で生成可(開始マスの制限あり。第4節・第9節) |
| 縦横4連の爆弾1〜3個のように、cons が重なって全列挙が打ち切られる | `cons` + `probe:true`(tidy。solver の probe 推論) |
| すべての2x2に爆弾が1個以上 | `cons` では書けるが、D8 の数字0開始と両立しない(開始マスの安全領域に爆弾なし2x2が必ず入る)。**CORE拡張(開始マスの扱いを変える)が前提** |
| 数字が数えるマスの変更(十字、桂馬、リング) | `nb` だけ |
| 爆弾の連結成分サイズ固定 | `grp` だけ(実装済み) |
| 爆弾が孤立しない(8近傍に別の爆弾) | `iso:true` だけ(実装済み) |
| 爆弾が8近傍で2〜n個の塊になり、塊同士は触れない | `iso:n` だけ(実装済み。noIsolate) |
| 爆弾全体が8近傍でひと続き | `conn` だけ(実装済み) |
| 爆弾の連結成分は直線のみ・斜め不可 | `cons` だけ(rect。下限なしなので生成可) |
| 爆弾が左端から右端までつながる列(龍)がある | `dragon:true` だけ(実装済み。dragon) |
| 左右+上下の2体の龍があり、龍に触れる爆弾は龍だけ | `dragon:2` だけ(実装済み。twinDragon) |
| 爆弾全体が1つのヘビ(自己に縦横で触れない) | **CORE拡張**: 新しい全体制約(連結性)。[grp] と同型 |
| 「各行・各列に正直な数字が1つ」の逆(嘘が各行列に1つ)など、特別マスの意味だけ変える | `liar:2` だけ(実装済み。liar2) |
| 数字が「色つきマス or 色なしマス」の爆弾数 | **CORE拡張**: 盤面の色分け(静的パターン)+ 数字が2択(選言)の推論。[liar] と同型(盤面ごとの隠れ状態を gen が持つ) |
| 偶奇だけの数字 / 範囲で出る数字 / 数字が複数 | **CORE拡張**: 数字の意味変更(solver の数字制約の作り方、sim の num、draw) |
| プレイ中に状態が動く / lo,hi で書けない制約 | **CORE拡張(大)**: 要相談 |

**CORE拡張で触る場所**(既存の拡張は行頭の `[grp]` `[liar]` `[iso]` `[conn]` `[wt]` `[dragon]` の印で探す。新フックは同じ位置に並べる。liar 系は `P.lie`=1/2 で分岐する: solver は `LV=P.lie==2`、gen も `LV`。`L.hon[]` は「特別マス」の集合で、liar では正直マス・liar2 では嘘マス。`mkShown` が `!!hon[i]!==LV` なら正直、それ以外は ±1 ズレ):

1. `registry.js` — `reg` に新フィールドの検査、`conflict` に併用不可、`stepOf`(爆弾数の倍数があるなら)。
2. `prep.js` — `prep` で P に必要情報を載せる(例: grp は `adj`)。
3. `solver.js` `deduce` — 制約の作り方(`add`。`[probe]` は単一制約の推論が空のときだけ、全列挙の前に働くブロック)と、全列挙 `rec` 内の枝刈り(必要条件のみ)、必要なら全マス1成分へ併合(liar 方式)、`why` の根拠に rule id を足す(ヒント用)。
4. `gen.js` — `valid`(全体制約の判定。下限つき cons は `lsample`/`smove` が担当)、`sample`(標準サンプラが作れない配置なら専用サンプラ)、山登りの専用 move(`gmove` 相当)、隠れ状態があれば `L` のように一緒に作って動かす。`nec`(外すと詰む検査の対象)に入れる。
5. `ui/modal.js` — `tags` にタグを1行、例盤面(`mini`/`exHtml`)で見せ方が要るなら追記。数字の表示が変わるなら `ui/board.js` の `draw`。
6. `game/play.js` の `start` で、gen の返す隠れ状態(`res.L` 相当)を `G.num` などに反映。

## 8. 検証(出力前に必ず)

```
node tools/headless.js <新ruleのid>        # 単体 + そのidを含む全ペア。NG(…)/併用NGが出たら直す
node tools/headless.js --combo a,b,c       # 3縛り以上の同時適用を試す
node tools/smoke-ui.js                     # UI一式の通し(ルール登録→生成→操作→例盤面)+チャレンジの通し。チャレンジの数値(CHALLENGE)を変えても通るように書いてある
python3 build.py                           # rules ブロック同期 + dist 生成
```

- 検査は爆弾数を `mpick`(ok と mstep を満たす最小値)で自動選択する。「未検査(適用外)」は 7x7/9x9 で成り立つ爆弾数が無いという意味。
- 実行できない環境では、ユーザーがアプリの「検査レポート → ルール検査を実行」を押して出たレポートを貼る。
- 併用NG(ペアの生成失敗)の直し方: ①本当に論理的に両立しないなら `conflicts` に入れる ②生成が下手なだけなら gen 側を改善する(第9節)。①の安易な乱用は避け、理由を1行コメントで残す。

## 9. 既知の制限

- **下限(lo)つき cons**: lo>0 の cons があると、`sample` は標準サンプラ(上限しか見ない)の代わりに `lsample` を使い、山登りは `smove` を使う。grp / iso / conn と併用のときは各専用サンプラが優先で、下限は見ない(tidy は groupBomb / noIsolate / allConnected を `conflicts` で除外している)。
- **開始マスの安全領域**: 開始マスの nb が数えるマスは全部安全にされる。この領域が下限つき cons に反する開始マスは使えない。tidy の旧3連版(縦横3連に爆弾1〜2個)は四隅だけが開始マスになった(7x7 で確認。毎回隅から始まる)。現行の4連版(縦横4連に爆弾1〜3個)は、D8 の安全領域が最大3x3(一直線に3マスまで)で4連に収まらないので、四隅に限らない可能性が高い【未確認】。nb が一直線に4マス以上の安全領域を作るルール(tidy.js が `conflicts` に挙げる crossScan など。`cross` は腕1マスなので対象外の見込み)は4連に反するので併用不可。「全ての2x2に爆弾1個以上」(7x7, 爆弾12個)の単体検査 NG(0/4) も、この矛盾が原因の可能性が高い(未確認)。開始マスの数字が0でなくてもよいことにするのは CORE拡張(sample・sim・play.js の start)。
- **probe 推論(tidy)**: `deduce` は成分ごとの全列挙が3万ノードを超えると諦める。tidy の連制約(現行は4連、旧は3連)は盤面全体を1成分にする。旧3連版では四隅開始(最初に開くのは2x2)から5マスしか進まず、全ペアが生成NGになった。そこで `probe:true` のルールがあるとき、単一制約の推論が空なら(全列挙の前に)未確定マスを爆弾/安全と仮定し、全制約(数字・cons・残り爆弾数)の上限/下限だけの単純な伝播で矛盾を探す(矛盾なら逆が確定)。必要条件のみの伝播なので sound。全列挙の空回りが sim 1回の時間の大半だったので、probe ルールでは全列挙のノード上限を500にしている。
  - 以下の数値は旧3連版のときの計測で、4連版では取り直していない(記録なし)。5x5 全配置との照合で probe 由来1798件に誤り0件。5x5〜9x9 の爆弾が盤面の4〜6割で、生成は最長5秒(ほとんど1秒以内)、品質条件つき。sim が約6ms→約2ms。
  - **現行4連版の爆弾数の範囲**: `ok` で爆弾を盤面の3〜6.5割に制限している(4連の理論上の限界は2.5〜7.5割)。6x6/7x7/8x8 の3〜6.5割を単体で生成確認済み(各3回中3回成功)。7割では 6x6 が失敗した(25個で3回中0回)ので6.5割までにした。9x9以上は未検査。
  - liar/grp/iso/conn の全体制約は伝播に入れない(弱くなるだけで sound は保つ)。重み(wt)は伝播で考慮する。
  - ヒント(`all=1`)の根拠 `why` は近似(そのマスに触れる数字とルールを挙げるだけ。probe の推論は離れた制約も使う)。
  - 併用ペア(tidy+◯◯): tidy の `conflicts` は現在 crossScan / noTouch / rect / allConnected / groupBomb / noIsolate(理由は tidy.js 冒頭のコメント。crossScan は腕2マスの十字 nb で、開始マスの安全領域が一直線に5マス並ぶため)。cross+tidy と liar+tidy は、検査で1回生成失敗・次の検査では失敗なし(2026-11-06)で未確定なので `conflicts` に入れていない(フリープレイで各10回ほど生成して成功率を見て決める)。このうち noTouch は、3連版では「ほぼ市松に固定」で生成失敗していたが、4連では緩むので縦横だけの隣接禁止なら両立する可能性が高い【未検査】(noTouch.js で確認できたら外す)。rect は、爆弾が4マス間隔・半ずらしの格子にほぼ固定され盤面が似通うので除外している。他の併用ペアは、この solver で検査してから `conflicts` を決める。
- 大盤面+高密度では探索が長引き、上限(約2分)で失敗することがある。生成中は経過表示とキャンセルボタンがある。
- liar / liar2: 全未開マスを1成分として列挙するので、盤面が大きいと推論が打ち切られ(安全側)生成が難航する。tidy との併用は、検査で1回生成失敗・次の検査では失敗なし(2026-11-06)で未確定(`conflicts` には入れていない)。
- liar2(2026-11-07 追加): 自前ハーネス(5x5/M5, 6x6/M7, 7x7/M10 を各8回。liar2 単体、+十字 nb、+各行2個以下の cons)で生成 全成功・solver unsound なし・各行各列にちょうど1つの嘘を確認。`node tools/headless.js liar2`(全ペア)と `node tools/smoke-ui.js` は**未実行**(tools/ を持っていないため)。併用ペアのNGは、そのレポートを見て `conflicts` か gen 改善を決める。推論の弱点は liar と同じ(全列挙が打ち切られると安全側に諦める)。嘘が1つしかない分、確定できる情報は liar より多いはずだが、その行列制約(嘘を使い切った行の残りは全部正直)は全列挙の中でしか効かない。大盤面で難航するなら、行・列の嘘数が確定したときに残りの数字制約を `[d,d]` に締める伝播を足す(必要条件のみ・sound のまま足せる)。
- dragon(2026-11-07 追加): 推論は、安全でないマスだけで左→右の道があること(全列挙 `rec` の枝刈りと直接推論)。直接推論は2つ: ある列で龍が通れるマスが1つだけならそこは爆弾 / 残り爆弾数が龍に必要な未確定爆弾の最小数(確定爆弾は費用0、未確定は1の最小費用の道)ちょうどなら、最小の龍が通れない未確定マスは安全。どちらも存在の前提から必ず導けるので sound(tier1、src は dragon)。生成は `dsample`(DFSで龍を置き、残りを密度ムラで撒く。直進の確率 p は盤面ごとにランダム 0.1〜0.9、ずれるときの上下は等確率。左右端の行は自由)と、valid を保つ付け替え `smove`。`dok`/`dpath` は prep.js。検査(自前ハーネス): 5x5・4x6・6x4・3x7 の全配置との照合で確定 約4600件・誤り0件。7x7 は M=7〜22、5x5 は M=5〜11、6x6 は M=6〜16、8x8 は M=10〜25、9x9 は M=9〜32 で各3〜4回中全部成功(品質OKも全部。ただし 7x7 M=22 は4回中1回が品質未達で、そのため上限を4割にした)。併用(7x7、各3回): +liar は M=9/13/17 全て品質OK、+十字nb は M=17 で3回中1回だけ品質OK(成功はする)、+各行3個以下の cons は M=13 で品質OK 2/3。+allConnected は品質未達が多いので conflicts。`node tools/headless.js dragon`(全ペア)と `node tools/smoke-ui.js` は**未実行**(tools/ を持っていないため)。例盤面は龍の一例を橙枠で見せる(`.drg` は modal.js が style を足す)。左→右の向きのみ。上下の龍は未対応。
- twinDragon(2026-11-07 追加。`dragon:2`): 意味は「爆弾の8近傍連結成分のうち1つ D が、龍H(左→右)と龍V(上→下)の和集合ちょうど。H⊄V かつ V⊄H(斜め一本道を2体と数えるのは不可。同じマスを通るのはOK)」。D 以外の爆弾は D に触れない限り自由で、別の塊が龍になることは起きない(Hと Vに必ず触れるため)。判定は prep の `tok`/`tpath`(Hを全列挙、残りのマスをVが通れるかを行ごとのDP。D は最大 R+C マスなので速い)。推論(solver の [dragon] の TW): ①龍と同じ必要条件と直接推論(層で通れるマスが1つなら爆弾 / 残り爆弾数=必要最小数なら道に乗らないマスは安全)を上下の向きにも ②龍でない(道に乗れない)確定爆弾の8近傍は龍になれない(bn。固定点まで反復) ③確定の龍に触れる確定爆弾も龍 ④確定の龍に触れる未確定マスで、道に乗れないものは安全。全て必要条件のみ。生成は `tsample`(Hを置いてからVを置く。Vは H のマスを通りたがる確率が盤面ごとにランダム。残りは H∪V の8近傍を避けて撒く)と、valid を保つ `smove`。`ok` は M>=max(R,C)+1 かつ M>=R+C-3 かつ M<=盤面の4割。検査(自前ハーネス): 5x5/4x6/6x4/4x4 の全配置(M=6〜10, 有効配置 最大8.6万個)で、solver の確定が「盤面状態と矛盾しない全ての有効配置」で真であることを約17万件照合して違反0(双竜由来の確定を含む)。生成は 7x7 M=8〜30、9x9 M=11〜48、12x12 M=18〜57、16x16 M=28〜100、24x24 M=47〜150 で各4〜5回中ほぼ成功・品質OK(7x7 M=32 は品質未達、M>=34 は失敗。16x16 M=100 は5回中2回、24x24 M=150 は5回中3回成功で遅い=上限4割は大盤面では遅め)。3x3 は品質未達なので ok が空(M範囲が空)になる。併用(7x7 M=13、各5回): +十字nb は品質OK 3/5(2.3秒。龍と同様に難しめ)、+桂馬 / +liar / +liar2 / +各行3個以下 / +colorDouble / +横4連3個以下 は品質OK 4〜5/5。9x9 の liar2 や liar 系との3縛りは、生成が遅く品質未達が多い(龍でも同じ傾向。liar の全列挙打ち切りが原因)。conflicts: dragon / groupBomb / noIsolate / noTouch / rect / allConnected(理由は twinDragon.js 冒頭)。`node tools/headless.js twinDragon`(全ペア)と `node tools/smoke-ui.js` は**未実行**(registry.js / selftest.js / tools/smoke-ui.js が手元になく、自前の最小スタブで検査した)。例盤面は橙枠で2体の龍を見せ、NG例は「龍以外の爆弾を龍に触れるマスへ動かした盤面」(赤枠=動かした爆弾。龍以外の爆弾が無いときは龍が途切れる盤面)。
- grp の推論は局所的(grp マス以内)な必要条件のみ。
- conn の推論は「確定爆弾が全て、安全でないマスの同じ連結領域にあり、その領域が M マス以上」という必要条件のみ。生成は鎖っぽく育てるサンプラ(`csample`)と、切れない爆弾を付け替える move(`cmove`)。lines のような下限つき cons と併用すると、品質条件を満たす盤面が出にくく遅い(品質未達の盤面で妥協することがある)。
- iso の推論は「爆弾にするには8近傍に安全でないマスが要る」という必要条件のみ。`iso:n` ではさらに「確定爆弾の8近傍連結成分は n 個以下」も必要条件として使う。生成は8近傍の塊(`iso:true` は2〜4個、`iso:n` は2〜n個で塊同士は触れない)を置くサンプラと、塊を壊さない move(`isample`/`imove`。`iso:n` は塊ごと動かす手もある)を使う。`iso:n` は爆弾が盤面の約4.5割を超えると生成が極端に遅い(noIsolate の `iso:4` は 7x7 で M=22 まで、24 で失敗)。下限つき cons(lines など)との併用は、サンプラが下限を見ないので当たりが薄くなる可能性がある。

## 10. 追加手順チェックリスト

1. `rules/<id>.js` を作る(第4節。ファイル名=id)。
2. `node tools/headless.js <id>` → OK か、併用NGは妥当か確認。`node tools/smoke-ui.js`。
3. `python3 build.py`(index.html の RULES ブロックが自動更新される)。手でやるなら index.html の `RULES:BEGIN〜END` 内に `<script src="rules/<id>.js"></script>` を1行足す。
4. `CHANGELOG.md` に1行追記。
5. デイリーに関わる変更なら `node tools/daily-e2e.js` も通す(Node 22.5+)。意味を変えたなら BOARD_VER を +1(第6節)。

## 11. デイリー(毎日1盤面・1人1回・タイムランキング)

**構成**: 画面 `js/ui/daily.js` →(同じサイトの `/api/...`)→ Cloudflare Pages Functions(`functions/`)→ D1(`schema.sql`)。盤面は GitHub Actions(`.github/workflows/daily.yml`)が毎日作って、管理API `PUT /api/admin/board` で登録する。公開先: `https://minesweeperplus-6o4.pages.dev`(Git 連携の Pages)。

**日付は全部サーバーの JST**(端末の時計は使わない)。盤面は 0:00 JST に切り替わる。

**API**(すべて JSON・`cache-control: no-store`。ranking だけエッジに600秒):
- `GET /api/daily/status?token=` → `{day,ver,state}`。state = prep(今日の盤面なし)/new/playing/done。ver = 盤面コードのルールセット番号
- `POST /api/daily/start {token}` → `{day,code,startedAt}`。盤面を渡す唯一の場所。1日1回(409=played)。応答が届かなかった人は20秒以内なら同じ盤面を再取得できる(RETRY_MS)。503=prep
- `POST /api/daily/finish {token,day,clear,name}` → `{ok,ms,rank}`。タイムはサーバーが「今−開始−CD_MS」で測る。ランキングに残るのは クリア かつ 上位20位 だけ
- `GET /api/daily/code?token=` → 今日の盤面コード。**終わった(done)端末にだけ**渡す
- `GET /api/daily/ranking` → 1〜6日前の盤面コードとランキング(今日の分は出さない)
- `GET/PUT /api/admin/board`(`Authorization: Bearer DAILY_TOKEN`)。GET は `{exists:true}`(200)/`{exists:false}`(404)。PUT は `{day,code}` で登録。すでにあれば置き換え、その日の plays/ranks を消す(=みんなやり直せる)。日付は今日の −1〜+2 日だけ受け付ける
- `GET /ping` → `{ok,binding,tables,token}`(D1 の DB 結合・テーブル有無・DAILY_TOKEN の有無。値は返さない)。動作確認用

**画面の状態**: DYS.state = ''(読み込み中)/new/prep/done/err。途中で離れて戻った(サーバー上 playing)人はミス扱いで終了(finish clear:false)。`err` のとき、404 または「200 なのに JSON でない」は「サーバー機能が見つかりません」と表示(Pages は functions が無いと index.html を 200 で返すことがあるため)。

**盤面作り**: `daily.yml`(18:00 JST=09:00 UTC と 00:10 JST=15:10 UTC)。対象日は「今から12時間後の JST の日付」(18:00台→翌日 / 00:10台→今日)。手動実行は `day`(空=自動)と `force`(作り直し)。手順: 設定確認(`/ping` が ok・binding・tables・token すべて true)→ 「すでにあるか」(`"exists":true` が返ったときだけ「ある」)→ `node tools/daily-gen.js` → PUT(HTTP 200 以外は失敗)。生成の抽選・制限時間は `tools/daily-plan.js` の DAILY。

**設定の置き場所**: GitHub の Secrets `DAILY_TOKEN`、Variables `DAILY_SITE`(`https://` から・末尾 `/` なし)。Cloudflare Pages の環境変数 `DAILY_TOKEN`(GitHub と同じ値)、Bindings の D1 変数名 `DB`。D1 に `schema.sql` を1回実行。

**過去にハマった点(原因の切り分け順)**
1. 画面のアドレスが本番 `minesweeperplus-6o4.pages.dev` でない(プレビュー用の英数字付きアドレス・別ドメイン・保存したHTML)→ `/api/...` に届かず「サーバー機能が見つかりません」。
2. `functions/` のファイル名に空白・`(1)` が付く(ダウンロードして置くと付きがち)→ そのURLの機能が公開されない。
3. `DAILY_SITE` を Secrets に入れた/末尾に `/` を付けた(`//api/...` になる)。
4. 旧 workflow は「HTTP 200=盤面あり」と判定していたため、404 の代わりに index.html が 200 で返ると「すでにある」と誤判定した。今は `"exists":true` だけを見る。
5. 切り分けはまず `/ping`(false が付いた項目が原因)。

**ユーザー向けの管理手順は `DAILY.md`**(仕様を変えたら必ず更新する)。

