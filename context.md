# Minesweeper Variants — context.md

> 新しいチャットのAIへ: まずこのファイルを全部読む。**プロジェクト全体は不要**。第3節の表で「今回の作業に必要なファイル」だけをユーザーに頼む。

## 0. あなたの役割と出力ルール

- 役割: マインスイーパーの「縛り(ルール)」の追加・修正・併用矛盾の解消担当。必要なら CORE(推論/生成)も拡張する。
- 画面の文言は日本語と英語の2言語(第12節)。文言を足す/直すときは `tx()` と英語の訳もセットで出す。
- ユーザーは日本語話者で、**コードは書けない/読めない**。専門用語・コマンドは避け、手順は「GitHub の画面でこのファイルを開く→鉛筆→ここを直す→Commit」のように1手ずつ。ファイルを渡すときは変更ファイルを丸ごと(置換位置の指示だけにしない)。簡潔に。案が複数あるなら短く列挙して選んでもらう。
- **渡されていないファイルは推測で書かない。** 必要なら「◯◯を渡してください」と先に言う。
- 出力は「変更・新規ファイルの全文」+「CHANGELOG.md に足す1行」+「併用NGを conflicts に入れた旨」。大きいファイル(solver.js / gen.js)だけは「置換前→置換後」の差分でもよい。
- 新ルールが **CORE拡張を要する** なら、作る前にユーザーに確認する(判定は第7節の表)。
- コードが実行できる環境なら、出力前に必ず検証する(第8節)。できないなら、ユーザーに「検査レポート」を貼ってもらう。

## 1. ゲーム概要

- 単一HTML のマインスイーパー・バリアント。「縛り」をランダムに/選んで攻略する。
- 最重要: **ノーゲス(運ゲー無し)盤面だけを出す**。開始マスは自動オープンし(ふつうは数字0で周囲も開く)、推論だけで完走できる配置のみ採用。かつ単調でない(推論の種類>=2、手順3段以上、各縛りを外すと解けなくなる=飾りでない)。
  - `startOnly` の縛り(uniform)のときだけ、開始マス1つだけを開き、数字は0でなくてよい。その代わり、開始マスの数字から確実に安全と言える最初の1手ぶんのマスも最初から開く(`play.js` の `setBoard`)。
- フリープレイ: 盤面/爆弾数/縛りを自由指定、ミス=即終了。盤面サイズは入力1つ「盤面の縦と横の長さ」(`#S`。3〜24)で常に正方形。内部の `cfg` は R と C を別々に持ち、同じ値を入れる(`config.js` の `plan` / `freeCfg`)。縛りが今の盤面・爆弾数に合わないとスタートを止める。
- チャレンジ: **設定画面なしの完全ランダム**。盤面・爆弾率・縛りの数を抽選し、縛りは全ルールから抽選。爆弾数が縛りに合わなければ前後どちらか(ランダム)へずらし、合わなくなった縛りは外す。`CHALLENGE.wins`(既定3)盤面クリアで達成(`missResetsStreak` が false なら累計、true なら連続=ミスで0に戻る)。ミスは挑戦全体で `lives` 回まで、ヒントは**1盤面ごと** `hints` 回(次の盤面で回復)。クリアでもミスでも次の盤面へ(ミスした盤面はフリープレイ同様に全開示)。生成が `regenSec` 秒を超えると「引き直す」ボタン(縛り等を再抽選。盤面番号は進まない)。達成/ゲームオーバーで演出(#fin)。ウィンストリーク(チャレンジ達成の連続回数)を localStorage に保存し、開始画面に出す(ゲームオーバーで0)。**数値・文言の調整は `js/game/challenge.js` の `CHALLENGE` だけ**(開始画面の解説文も `chDescHtml` がここの値から作る)。
- フリープレイの盤面コード欄: 爆弾数の右の「盤面コード(貼り付け専用)」。デイリーの盤面コードを貼ると、その盤面(生成せずそのまま)を遊べる。貼ると盤面サイズ・爆弾数・縛りがコードの値になり、**キャンセル / スタートしか押せなくなる**(ほかの入力は薄くして触れなくするだけで、並びは動かさない)。ルールセット番号がコードより古いアプリ側(=コードの番号 < BOARD_VER)は「バージョンアップのため使えません」で断る。キャンセルで貼る前の設定に戻る。打ち込みは不可。
- 盤面コードのコピー(フリープレイ/チャレンジ): 盤面画面の上、「← 設定に戻る」と「🧩 縛り」の間に小さく薄いボタン「コード」(`#cp`)。押すと盤面コードがコピーされ、文字が1.2秒だけ「copied」になる(幅固定)。ミスした盤面でもコピーできる。チャレンジのゲームオーバー/達成の演出カードにも同じボタン(`#fincp`)があり、最後の盤面のコードをコピーできる。コードは `setBoard` が `G.code` に入れる(`boardEncode`)。デイリー中は「今日の盤面は終わるまで出さない」ので、ボタンも出さずコピーもしない(`DY`)。実装は `js/ui/copycode.js`(`cpUpd` / `cpFin` / `cpCopy`)。
- ヒント: ON/OFF式。ON中に数字・縛り・残り爆弾数をタップすると、その手がかりから確定できるマスがあるかだけ答える(場所は教えない)。
- 操作: モードは「開ける/旗/マーク」(`fm`=0/1/2)。マークは旗の色違いのメモで、残り爆弾数とヒント推論には影響しない(旗だけが「既知の爆弾」扱い)。同じ印をもう一度立てると外れ、別の印は置き換え。旗/マークの立っているマスは開けない。右クリックは選択中の印を立てる(開けるモード中は旗)。

## 2. ファイル構成

読み込み順 = 依存順。**`<script src>` の一覧は index.html が唯一の正**(build.py / tools もこれを読む)。クラシックスクリプトでグローバル共有(ES modules は file:// で動かないので使わない)。

```
index.html            画面のHTML骨格 + script読み込み順 (RULES:BEGIN〜END は build.py が自動同期)
build.py              全部インライン化 → dist/minesweeper-variants.html (python3 build.py)
context.md            ← これ。CHANGELOG.md = 変更履歴。README.md = 人間向け手順
css/style.css         見た目のみ (チャレンジの解説・終了演出、盤面のオセロ風の見た目、ドット絵アイコン `.px`。第13節)
functions/en.js ja.js /en と /ja で index.html をそのまま返す(アドレスは変わらない)。第12節
js/i18n.js            言語の決定(URL の /en /ja、確認用 ?lang=)・tx('日本語')・rname/rdesc/rwhy・index.html の一括置き換え(i18nDom)
js/i18n-en.js         英語の文(キー=日本語の文)
js/i18n-en-rules.js   縛りの英語の名前・説明・why(I18N_RULES[id])。縛りを足したらここにも足す
tools/i18n-check.js   訳の漏れ検査(node tools/i18n-check.js)。ブラウザ不要
js/core/              推論と生成。DOM非依存(node でも動く)
  util.js             rnd, D8/D4/KN, offs, gcd
  registry.js         RULES, reg, conflict, stepOf/mfit/mok/mnear/mpick
  prep.js             prep(cfg)→P(問題定義。`s1`=開始マスだけ安全にするか), gcomps
  solver.js           deduce(確定推論エンジン), sim(解き進めシミュ)  ★全体制約の主戦場。[probe]=仮定して矛盾を探す推論(`[pk]`=重ならない2×2の下限の合計で矛盾を探す検査つき)。各手の `cost`(難易度の物差し)は第11節「難易度の上限」
  gen.js              gen(ノーゲス盤面の生成・山登り・品質判定。品質は `o.maxCost` で難易度の上限も見る)  ★配置様式の主戦場。下限つき cons 用は lsample/smove。開始マスと必ず安全にするマスは `SZ(s)`(`P.s1` なら開始マス1つだけ、そうでなければ nb も)
  selftest.js         selfTest(単体+併用ペア検査), buildReport
  boardcode.js        盤面コードの符号化(boardEncode/boardDecode)
  boardver.js         ルールセット番号 BOARD_VER
js/game/              盤面の進行(DOMを読み書きする)
  state.js            グローバル状態 G/run/SEL..., $ v chk mode msg show
  challenge.js        チャレンジ: CHALLENGE(数値の唯一の置き場), 解説文 chDescHtml, ウィンストリーク保存, run の進行 chNewRun/chNewBoard/chMiss/chClear, 終了演出 chEnd
  config.js           設定→cfg: norm, pick, plan, chPlan(チャレンジ抽選), freeCfg, problems。フリープレイの盤面サイズは `v('S')` 1つから R=C を作る
  play.js             start(gen呼び出し。nr=新挑戦, again=引き直し), flood, act, hscan, ask(ヒント)。`setBoard` は startOnly のとき開始マスの直後に最初の1手ぶんも開ける
js/ui/                描画と配線
  board.js            draw (チャレンジ中は ✅クリア X/N・第N盤面・❤・💡 のチップ、「次の盤面」ボタンの出し分けもここ。絵文字→ドット絵の変換 `pxi` と対応表 `PXI` もここ。第13節)
  modal.js            縛りモーダル, tags(縛りのタグ), 例盤面 mini/exHtml(爆弾はドット絵), longpress
  copycode.js         盤面コードのコピーボタン(#cp / #fincp)。daily.js の dyCopy を使うので daily.js より後に読む
  picks.js            厳選盤面の一覧(タイトル横の「🎯 厳選盤面」#pkb → #pkm)。daily.js の dyApi/dyCopy を使うので daily.js より後に読む (pkOpen/pkDraw/pkCopy)
  freecode.js         フリープレイの「盤面コード(貼り付け専用)」欄 (FC, fcApply/fcCancel/fcStart)
  daily.js            デイリー画面(スタート/3,2,1/タイマー/結果/ランキング/盤面入手)。サーバーとの通信もここ
  main.js             upd, setMode, 検査レポート欄(?repo をつけたときだけ表示), 全イベント配線(load。操作ボタンの絵文字をドット絵に変換するのもここ。第13節)
rules/                1ルール=1ファイル(ファイル名=id)。_始まりは読み込まれない
  _template.js        ひな形 (reg の全フック一覧つき)
  noTouch cross crossScan knight lines liar liar2 groupBomb rect noIsolate allConnected colorDouble tidy dragon twinDragon mirror uniform .js
tools/
  headless.js         ブラウザ無しで検査: node tools/headless.js [id...] | --combo a,b,c
  smoke-ui.js         偽DOMでUI一式+チャレンジの通しを動かす: node tools/smoke-ui.js
  daily-plan.js       デイリー盤面の抽選と生成。数値の調整は先頭の DAILY だけ(盤面サイズ・爆弾率・生成の制限時間・難易度の上限 `maxCost`)
  daily-gen.js        daily-plan を core+rules と読み込み、盤面コードを JSON に書く: node tools/daily-gen.js payload.json YYYY-MM-DD (workflow が使う)
  pick-plan.js        厳選盤面の抽選と生成(デイリーと同じ作り方で、難易度の下限だけ違う)。数値の調整は先頭の PICK だけ
  pick-gen.js         pick-plan を core+rules+daily-plan と読み込み、盤面コードを JSON に書く。見つからなければファイルを書かず正常終了(workflow が使う)
  daily-e2e.js        デイリーの通しテスト(偽D1+偽DOM。functions/ の本物を動かす): node tools/daily-e2e.js (Node 22.5+)
  daily-streak.js     デイリーの連勝記録だけの検査: node tools/daily-streak.js
functions/            Cloudflare Pages Functions(デイリーのサーバー側)。★ファイル名がそのままURLになる。_lib.js=共通(メンテ判定 getMaint/maintPhase/playBlocked/boardLocked もここ), ping.js=動作確認, api/daily/{status,start,finish,code,ranking}.js, api/admin/board.js, api/picks.js(厳選盤面の一覧。公開), api/admin/pick.js(厳選盤面の登録・今日の本数。管理者), api/admin/maint.js(メンテの予約・解除)
schema.sql            D1(SQLite)のテーブル定義。Cloudflare の D1 → Console に貼って1回実行
.github/workflows/daily.yml        毎日の盤面作りの自動実行(メンテ中は作らない)
.github/workflows/picks.yml        厳選盤面を作る自動実行(毎日6回。手動実行も可。見つからなくても失敗にしない)
.github/workflows/daily-maint.yml  メンテナンスの予約・解除・状態確認。管理者が手で実行するだけ
DAILY.md              ★ユーザー向けのデイリー管理ガイド(非エンジニア向け)。仕様を変えたらここも直す
```

`P`(prep の結果): `{nb[i]=数字が数えるマス, cons=[{cells,lo,hi,src}], grp, gid, adj(上下左右), iso, iid, imax(iso の塊サイズ上限。0=上限なし), conn, cnid, adj8(8近傍。iso か conn のときだけ), R, C, lie(0=なし/1=各行列に正直1つ/2=各行列に嘘1つ), lid, w, probe/pid(probe推論を使うルールの有無とid), dragon/did(龍の有無とid。1=龍, 2=双竜。双竜のときは adj8 も載る), mir/mid(鏡爆弾の有無とid), ms(ms[i]=盤面の中心と点対称なマス R*C-1-i の周囲8マス), o4(上下左右), mk(鏡爆弾の個数。prep.js の `MIRN`。現在1), s1(1=開始マスだけ安全にする。縛りの `startOnly:true` で立つ。0=ふつう=開始マスの nb も安全にして数字0にする)}`。
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
| UIの見た目・操作の変更 | `context.md` + `index.html` + `css/style.css` + 該当の `js/ui/*.js` `js/game/*.js`。絵文字を絵にする/絵を直すなら第13節(`board.js` `main.js` `modal.js` も) |
| 画面の文言を足す/直す・英語(第12節) | `context.md` + `js/i18n-en.js` + 該当の `js/ui/*.js` `js/game/*.js` `index.html`(縛りの英語は `js/i18n-en-rules.js` と対象の `rules/*.js`) |
| デイリーの不具合(サーバー機能・登録・準備中など) | `context.md` + 症状(画面のメッセージ / `/ping` の表示 / Actions の赤い行)。コードは `functions/` `.github/workflows/daily.yml` `js/ui/daily.js` |
| デイリーの盤面(大きさ・爆弾率・生成) | `context.md` + `tools/daily-plan.js` |
| 厳選盤面(難易度の下限・出る頻度・画面) | `context.md` + `tools/pick-plan.js`(下限) / `.github/workflows/picks.yml`(頻度) / `js/ui/picks.js` `index.html` `css/style.css`(画面) |
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
 wt:(R,C,i)=>1,                    // 任意: マスiの爆弾が数字に数えられる個数(重み。色つきマスは2など。爆弾の総数は変わらない)
 liar:true,                         // 任意: 数字が実際と±1ズレる(各行・各列に正直な数字が1つ。縦横同じ盤面のみ)
 liar:2,                            // 任意: 逆版。各行・各列に嘘の数字が1つだけ(嘘は実際と±1ズレ)、ほかは全部正直
 grp:4,                             // 任意: 爆弾の縦横連結成分が全てちょうどこの個数
 iso:true,                          // 任意: どの爆弾も8近傍に別の爆弾がある(孤立禁止。nb に関係なく常に8近傍)
 iso:4,                             // 任意: 8近傍でつながった塊が全て2〜n個(nは3以上の整数)で、塊同士は触れない
 conn:true,                         // 任意: 全ての爆弾が8近傍でひと続き(nb に関係なく常に8近傍)
 probe:true,                        // 任意: cons が重なって全列挙が打ち切られるルール(tidy)で、仮定して矛盾を探す推論を使う
 startOnly:true,                    // 任意: 開始マスだけ安全にする(開始の数字は0でなくてよい)。下限つき cons が開始マスの安全領域と衝突するルール用(uniform)
 dragon:true,                       // 任意: 左端から右端まで、爆弾が1列ごとに同じ行か上下1行ずれでつながる列(龍)が必ずある
 dragon:2,                          // 任意: 2体版(双竜)。左右の龍H+上下の龍V。龍に8近傍で触れる爆弾は必ず龍の一部
 mir:true                           // 任意: 爆弾のうち P.mk 個(1個)が鏡爆弾(どれかは非表示)。数字の意味を変えるので excl:'num' を付ける(mirror.js)
});
```

共通:
- `cons` は盤面サイズ(R,C)だけから決まる静的制約。配置は必ず全 cons を満たし、ソルバも同じ制約で推論する。
- 同時に1つだけ: `nb`(`excl:"num"` で防ぐ)、`grp`、`liar`(`liar:true` と `liar:2` の合計)、`wt`、`dragon`(`true` と `2` の合計)。conflict が自動で防ぐ。
- 爆弾数に条件があるなら `ok` / `mstep` を書く(合わないとき前後の近い爆弾数が自動表示される。`why` は爆弾数では直らない理由のときだけ)。
- 良いルール: cons/grp を持つルールは「外すと解けなくなる」盤面だけが採用される(飾りにならない)。外しても解けるのが普通になる弱すぎる制約は生成が難航する。説明は1行でプレイヤーが理解できること。
- cons だけで書ける形の例: rect(爆弾は1x1〜1x4の直線、斜めにも触れない)は「2x2 の枠は2個以下」「2x2 の対角は同時に爆弾にならない」「横5・縦5の窓は4個以下」だけで書ける(全部 hi のみ=下限なしなので生成制限を受けない)。

各フィールドの意味と併用:
- `grp`: 爆弾を縦横につながった grp 個ずつの組にし、組同士は縦横で触れない。縦横に爆弾が隣り合うのを禁じる縛りとは `conflicts`。
- `liar` / `liar:2`(liar2): nb(十字/ナイト)や cons 系と併用できる。違いは「各行・各列に1つだけの特別マス」が正直か嘘かだけ(第7節)。`wt` とは併用不可(registry の `conflict` が常に防ぐので wt 側で `conflicts` を書かなくてよい)。フリープレイは常に正方形なので「縦と横が同じ盤面のみ」で止まることはない(チャレンジは `CHALLENGE.square` 次第)。
- `wt`: nb(十字/ナイト)と併用できる。
- `iso`: 「爆弾があるマスだけに課す条件つき制約」なので cons では書けない。nb / cons / liar と併用できる。
  - `iso:true` は grp とは併用不可(組の中が必ずつながるので飾りになる)。
  - `iso:n`(noIsolate の `iso:4`)は、塊を「爆弾の8近傍連結成分」で決め、全ての塊が2〜n個。「塊同士が触れない」は定義から自動で成り立つので別に書かない。grp・conn とは併用不可(conn とは全体が1塊になり爆弾数が n 個以下に限られるため)。爆弾が盤面の約4.5割を超えると生成が極端に遅いので、ルール側の `ok` で上限を付ける。
- `conn`: cons では書けない全体制約。nb / cons / liar / grp と併用できる。iso:true(飾りになる)・iso:n・rect(成り立たない)とは併用不可。
- **下限(lo>0)つき cons**(tidy など): 生成は第9節の `lsample` / `smove`。grp / iso / conn と併用すると各専用サンプラが優先され下限は見ない(tidy が groupBomb / noIsolate / allConnected と `conflicts` なのはこのため)。
  - **開始マスの安全領域に注意**: 開始マスは数字0(周囲を自動で開く)なので、nb が数えるマスは全部安全になる。この安全領域が下限つき cons に反する開始マスは使えない。「全ての2x2に爆弾1個以上」は D8 では開始マスをどこに選んでも不可能なので、uniform は `startOnly:true` で開始マスの周囲を安全にしない。安全領域が一直線に4マス以上並ぶ nb(十字の腕が2マスの crossScan など)は、縦横4連に爆弾1〜3個の tidy と合わないので tidy が `conflicts` に挙げる(`cross`=D4・腕1マス は挙げていない)。下限つき cons を書くときは、安全領域が入っても成り立つ形か先に考える。
- `probe:true`: 重なる cons が盤面全体を1成分にして、solver の全列挙(3万ノード上限)が推論を諦めるルール(tidy)で宣言する。solver は単一制約の推論が空のとき、全列挙より前に、未確定マスを爆弾/安全と仮定して矛盾を探す(kinds に `2x`)。skip されるルール自身のときは無効(「外すと詰む」検査のため)。
- `dragon`: 「爆弾の列が左端の列から右端の列まで、1列ごとに行が同じか±1でつながって存在する」全体制約(存在制約なので cons では書けない)。龍以外の爆弾は自由で、龍に触れていてもよい。nb / cons / liar と併用できる。groupBomb / noIsolate / noTouch / rect は論理的に両立しない、allConnected は生成が難航するので `conflicts`(dragon.js)。爆弾数は C 個以上(龍の最短長)で、`ok` で盤面の4割まで。
- `dragon:2`(twinDragon): 龍H+龍V。`dragon:true` と同時には使えない(registry の `conflict`。`reg` は dragon に true か 2 だけを許す)。
- `mir`(mirror.js): 爆弾のうち **1個**(`MIRN`)が鏡爆弾。どれかは盤面に出さない(隠れ状態 `L.sp`)。マスpの鏡爆弾は `ms[p]`(中心と点対称なマスの周囲8マス)の数字を+1する。鏡爆弾は上下左右に爆弾が無い。表示する数字は `L.sh`(爆弾マスは0)。開始マスは盤面の中央寄り(中心から縦横 min(R,C)/4 マス以内)で、`ms[開始マス]` の中のマスは鏡爆弾にしない(開始マスの数字0を保つ)。`excl:'num'` で、liar / liar2 / colorDouble / dragon とは `conflicts`(数字の数え方が衝突。dragon は隠れ状態 L.sh を同じように使うため)。`ok` は爆弾数 2 以上〜盤面の6割まで。

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
- ルールの意味(nb/cons/推論/生成)を変えたら `js/core/boardver.js` の BOARD_VER を +1 し、ユーザーに「今日と明日の盤面を force で作り直す」手順(DAILY.md の A)を案内する。ルールを足すだけなら上げない。画面の文言・見た目だけの変更でも上げない(盤面コード・BOARD_VER・デイリーの記録は言語に関係なく共通)。
- `functions/` に置くファイルは、ファイル名がURLになる。空白・`(1)`・`.js` 以外を作らない(`tools/daily-e2e.js` が検査)。新しいAPIを足したら e2e のルート一覧にも足す。
- 画面のカウント秒数は `js/ui/daily.js` の `DAILY_UI.cdMs` と `functions/_lib.js` の `CD_MS` の **2か所** を必ず同じ値にする。
- Actions のログ(公開される)に、翌日の盤面コード・縛りを出さない。
- デイリーの「更新中」判定は `functions/_lib.js` の `playBlocked` / `boardLocked` の2つだけ(status・start・admin/board が使う)。新しい API で盤面を配る・受け付けるなら、同じ判定を入れる。
- 画面に出す文言は必ず `tx('日本語')` に通し、英語を `js/i18n-en.js` に足す(第12節)。
- 画面に絵文字(💣 🚩 ⛏ 💡 🧩 ❤)を出すときは `pxi()` を通してドット絵にする(第13節)。`textContent` に入れると絵文字のまま出る。ドット絵は `pointer-events:none` を外さない(外すとマスが押せなくなる)。

## 7. CORE拡張の判定と、触る場所

**判定表**(ユーザーのアイデア → 必要なもの):

| アイデア | 必要なもの |
|---|---|
| 行・列・ブロックの個数 / 隣接禁止 | `cons` だけ。下限つきは lsample/smove で生成可(開始マスの制限あり。第4節・第9節) |
| 縦横4連の爆弾1〜3個のように、cons が重なって全列挙が打ち切られる | `cons` + `probe:true`(tidy) |
| すべての2x2に爆弾が1個以上 | `cons` + `probe:true` + `startOnly:true`(uniform) |
| 数字が数えるマスの変更(十字、桂馬、リング) | `nb` だけ |
| 爆弾の連結成分サイズ固定 | `grp` だけ |
| 爆弾が孤立しない(8近傍に別の爆弾) | `iso:true` だけ |
| 爆弾が8近傍で2〜n個の塊になり、塊同士は触れない | `iso:n` だけ(noIsolate) |
| 爆弾全体が8近傍でひと続き | `conn` だけ |
| 爆弾の連結成分は直線のみ・斜め不可 | `cons` だけ(rect。下限なしなので生成可) |
| 爆弾が左端から右端までつながる列(龍)がある | `dragon:true` だけ |
| 左右+上下の2体の龍があり、龍に触れる爆弾は龍だけ | `dragon:2` だけ(twinDragon) |
| 「各行・各列に正直な数字が1つ」の逆(嘘が各行列に1つ)など、特別マスの意味だけ変える | `liar:2` だけ(liar2) |
| 隠れた特別な爆弾が、離れたマスの数字を+1する(鏡爆弾) | `mir:true` だけ(mirror。CORE の `[mir]` が担当) |
| 爆弾全体が1つのヘビ(自己に縦横で触れない) | **CORE拡張**: 新しい全体制約(連結性)。[grp] と同型 |
| 数字が「色つきマス or 色なしマス」の爆弾数 | **CORE拡張**: 盤面の色分け(静的パターン)+ 数字が2択(選言)の推論。[liar] と同型(盤面ごとの隠れ状態を gen が持つ) |
| 偶奇だけの数字 / 範囲で出る数字 / 数字が複数 | **CORE拡張**: 数字の意味変更(solver の数字制約の作り方、sim の num、draw) |
| プレイ中に状態が動く / lo,hi で書けない制約 | **CORE拡張(大)**: 要相談 |

**CORE拡張で触る場所**(既存の拡張は行頭の `[grp]` `[liar]` `[iso]` `[conn]` `[wt]` `[dragon]` `[mir]` `[pk]`(solver の probe 内) `[s1]`(gen / play)の印で探す。新フックは同じ位置に並べる。liar 系は `P.lie`=1/2 で分岐する: solver は `LV=P.lie==2`、gen も `LV`。`L.hon[]` は「特別マス」の集合で、liar では正直マス・liar2 では嘘マス。`mkShown` が `!!hon[i]!==LV` なら正直、それ以外は ±1 ズレ):

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
node tools/smoke-ui.js                     # UI一式の通し+チャレンジの通し(CHALLENGE の数値を変えても通る)
node tools/i18n-check.js                   # 画面の文言(と縛りの name/desc/why)の英語の訳漏れ。表示文言を触ったら必ず
python3 build.py                           # rules ブロック同期 + dist 生成
```

- 検査は爆弾数を `mpick`(ok と mstep を満たす最小値)で自動選択する。「未検査(適用外)」は 7x7/9x9 で成り立つ爆弾数が無いという意味。
- 実行できない環境では、ユーザーがアプリを `?repo` つきのアドレス(例 `https://minesweeperplus-6o4.pages.dev/?repo`)で開き、設定画面下部に出る「検査レポート → ルール検査を実行」を押して出たレポートを貼る。
- 併用NG(ペアの生成失敗)の直し方: ①本当に論理的に両立しないなら `conflicts` に入れる ②生成が下手なだけなら gen 側を改善する(第9節)。①の安易な乱用は避け、理由を1行コメントで残す。

## 9. 既知の制限と、各ルールの推論・生成の実装

**全般**
- 大盤面+高密度では探索が長引き、上限(約2分)で失敗することがある。生成中は経過表示とキャンセルボタンがある。
- 下限(lo)つき cons: `sample` は標準サンプラ(上限しか見ない)の代わりに `lsample` を使い、山登りは `smove` を使う。grp / iso / conn と併用のときは各専用サンプラが優先で、下限は見ない。

**tidy(probe 推論)**
- `deduce` は成分ごとの全列挙が3万ノードを超えると諦める。tidy の連制約(縦横4連に爆弾1〜3個)は盤面全体を1成分にするので、そのままでは推論が進まない。そこで `probe:true` のルールがあるとき、単一制約の推論が空なら(全列挙の前に)未確定マスを爆弾/安全と仮定し、全制約(数字・cons・残り爆弾数)の上限/下限だけの単純な伝播で矛盾を探す(矛盾なら逆が確定。必要条件のみなので sound)。probe ルールでは全列挙のノード上限を500にしている。
- `ok`: 爆弾数は盤面の3〜6.5割(4連の理論上の限界は2.5〜7.5割。7割では 6x6 が生成に失敗した)。
- liar/grp/iso/conn の全体制約は伝播に入れない(弱くなるだけで sound は保つ)。重み(wt)は伝播で考慮する。
- ヒント(`all=1`)の根拠 `why` は近似(そのマスに触れる数字とルールを挙げるだけ)。
- `conflicts`: crossScan / noTouch / rect / allConnected / groupBomb / noIsolate(理由は tidy.js 冒頭。crossScan は腕2マスの十字 nb で、開始マスの安全領域が一直線に5マス並ぶため。rect は、爆弾が4マス間隔・半ずらしの格子にほぼ固定され盤面が似通うため)。cross / liar との併用は `conflicts` に入れていない。他の併用ペアは、この solver で検査してから `conflicts` を決める。

**uniform(均一な配置。「全ての2x2マスに爆弾が1個以上」)**
- `cons`(各2x2の窓に lo:1, hi:4)+ `probe:true` + **`startOnly:true`(CORE拡張)**。
- `startOnly` の中身: prep.js が `P.s1` を載せ、gen.js の `SZ(s)` が「必ず安全にするマス」を `P.s1` なら開始マス1つ、そうでなければ開始マス+nb にする(`sample` / `gmove` / `imove` / `cmove` / 例盤面の `sz0` の5か所)。`startOnly` を使う縛りが無ければ動きは従来と同じ。solver.js と play.js の `flood` は変更不要(数字が0のときだけ周囲を開くため)。
- 開始の見た目: D8 では数字は必ず1以上で、最初に開くのは開始マス1つ。十字(D4)と併用のときだけ数字0になり、十字形に開く。最初の1手ぶんは `setBoard` が deduce を1回回して先に開ける(gen の sim は変更なし。盤面コードには入れない)。推論の種類は 2x(probe)+1n(数字)、場合により 1r・1c・3x。`maxc` は多くが6(probe)。
- `[pk]`(solver.js): probe の伝播で「数字の制約の中に収まる、重ならない下限つき制約たちの下限の合計 > 残りの上限 なら矛盾」を使う(必要条件のみ・sound。wt つきは対象外。重ならない選び方は全部試す)。これで「真ん中の2」からも出だしの推論ができる。
- `ok`: 3x3 以上で 盤面が12マス以上(3x3 は品質未達、2x2 は失敗)、爆弾数は「盤面を2x2で区切った個数(縦÷2×横÷2、切り捨て)」以上〜盤面の4割まで(7x7 なら9、9x9 なら20が下限。5割を超えると生成が極端に遅い/失敗する)。`why` は盤面サイズの理由。
- 最低密度の大盤面(20x20 以上)は生成が遅く、失敗することがある。
- `conflicts`: groupBomb / noIsolate / allConnected / dragon / twinDragon。**論理的には5つとも両立する**が、これらの専用サンプラ(`gsample` `isample` `csample` `dsample` `tsample`)は下限(lo)を見ないので、生成の都合で併用不可にしている。解禁するなら uniform の爆弾数の下限を約3割に上げる。

**liar / liar2**
- 全未開マスを1成分として列挙するので、盤面が大きいと推論が打ち切られ(安全側)生成が難航する。
- liar2 は嘘が1つしかない分、確定できる情報は liar より多いはずだが、その行列制約(嘘を使い切った行の残りは全部正直)は全列挙の中でしか効かない。大盤面で難航するなら、行・列の嘘数が確定したときに残りの数字制約を `[d,d]` に締める伝播を足す(必要条件のみ・sound のまま足せる)。

**dragon**
- 推論は、安全でないマスだけで左→右の道があること(全列挙 `rec` の枝刈りと直接推論)。直接推論は2つ: ある列で龍が通れるマスが1つだけならそこは爆弾 / 残り爆弾数が龍に必要な未確定爆弾の最小数(確定爆弾は費用0、未確定は1の最小費用の道)ちょうどなら、最小の龍が通れない未確定マスは安全。どちらも sound(tier1、src は dragon)。
- 生成は `dsample`(DFSで龍を置き、残りを密度ムラで撒く。直進の確率 p は盤面ごとにランダム 0.1〜0.9、ずれるときの上下は等確率。左右端の行は自由)と、valid を保つ付け替え `smove`。`dok`/`dpath` は prep.js。上限を4割にしたのは、それ以上だと品質未達が出るため。+allConnected は品質未達が多いので conflicts。例盤面は龍の一例を橙枠で見せる(`.drg` は modal.js が style を足す)。左→右の向きのみ(上下の龍は twinDragon)。

**twinDragon(`dragon:2`)**
- 意味: 「爆弾の8近傍連結成分のうち1つ D が、龍H(左→右)と龍V(上→下)の和集合ちょうど。H⊄V かつ V⊄H(斜め一本道を2体と数えるのは不可。同じマスを通るのはOK)」。D 以外の爆弾は D に触れない限り自由。判定は prep の `tok`/`tpath`(Hを全列挙、残りのマスをVが通れるかを行ごとのDP)。
- 推論(solver の [dragon] の TW): ①龍と同じ必要条件と直接推論を上下の向きにも ②龍でない(道に乗れない)確定爆弾の8近傍は龍になれない(bn。固定点まで反復) ③確定の龍に触れる確定爆弾も龍 ④確定の龍に触れる未確定マスで、道に乗れないものは安全。全て必要条件のみ。
- 生成は `tsample`(Hを置いてからVを置く。Vは H のマスを通りたがる確率が盤面ごとにランダム。残りは H∪V の8近傍を避けて撒く)と、valid を保つ `smove`。
- `ok`: M>=max(R,C)+1 かつ M>=R+C-3 かつ M<=盤面の4割。3x3 は品質未達なので M 範囲が空になる。大盤面(16x16 以上)は上限4割だと遅め。liar 系との併用は、生成が遅く品質未達が多い。
- `conflicts`: dragon / groupBomb / noIsolate / noTouch / rect / allConnected(理由は twinDragon.js 冒頭)。
- 例盤面は橙枠で2体の龍を見せ、NG例は「龍以外の爆弾を龍に触れるマスへ動かした盤面」(赤枠=動かした爆弾。龍以外の爆弾が無いときは龍が途切れる盤面)。

**mirror(鏡爆弾)**
- 推論は数字iを「nbの爆弾数が num[i]-sh 〜 num[i]-sl」の範囲制約にする(`deduce` の `MR`)。鏡爆弾の候補 `mpo` = 開いていなくて、上下左右に確定爆弾が無いマス、`mzt` = その候補の総数。sh(上限)= min(P.mk, ms[i]内の候補数, num[i], 点対称マスが開いていればその数字)、sl(下限)= max(0, P.mk-(mzt-ms[i]内の候補数))。必要条件のみで sound。
- 個数は `prep.js` の `MIRN` が唯一の置き場で、`gen.js` の `mstate` と `solver.js` はどちらも `P.mk` を読む(固定の数字を書かない)。個数を変えるのは数字の意味が変わるので **BOARD_VER を +1**。
- 生成は `mcs`(中央寄りの開始マス)・`mstate`(上下左右に爆弾が無い爆弾から P.mk 個を選び L={sp,sh} を作る)・山登りで鏡爆弾だけ選び直す手(`l2`)。高密度ほど `mstate` が null を返して作り直しが増える(難航するなら `ok` の上限を5割程度に戻す)。

**grp / conn / iso**
- grp の推論は局所的(grp マス以内)な必要条件のみ。
- conn の推論は「確定爆弾が全て、安全でないマスの同じ連結領域にあり、その領域が M マス以上」という必要条件のみ。生成は鎖っぽく育てるサンプラ(`csample`)と、切れない爆弾を付け替える move(`cmove`)。lines のような下限つき cons と併用すると、品質条件を満たす盤面が出にくく遅い。
- iso の推論は「爆弾にするには8近傍に安全でないマスが要る」という必要条件のみ。`iso:n` ではさらに「確定爆弾の8近傍連結成分は n 個以下」も使う。生成は8近傍の塊(`iso:true` は2〜4個、`iso:n` は2〜n個で塊同士は触れない)を置くサンプラと、塊を壊さない move(`isample`/`imove`。`iso:n` は塊ごと動かす手もある)を使う。`iso:n` は爆弾が盤面の約4.5割を超えると生成が極端に遅い(noIsolate の `iso:4` は 7x7 で M=22 まで、24 で失敗)。下限つき cons(lines など)との併用は、サンプラが下限を見ないので当たりが薄い。

## 10. 追加手順チェックリスト

1. `rules/<id>.js` を作る(第4節。ファイル名=id)。
2. `node tools/headless.js <id>` → OK か、併用NGは妥当か確認。`node tools/smoke-ui.js`。
3. `python3 build.py`(index.html の RULES ブロックが自動更新される)。手でやるなら index.html の `RULES:BEGIN〜END` 内に `<script src="rules/<id>.js"></script>` を1行足す。
4. `CHANGELOG.md` に1行追記。
5. デイリーに関わる変更なら `node tools/daily-e2e.js` も通す(Node 22.5+)。意味を変えたなら BOARD_VER を +1(第6節)。
6. 縛りの `name` / `desc` / `why` を足したら、英語も `js/i18n-en-rules.js`(`I18N_RULES[id]={name,desc,why}`)に足す。画面の文言を足したら `tx()` に通して `js/i18n-en.js` へ。最後に `node tools/i18n-check.js`(第12節)。

## 11. デイリー(毎日1盤面・1人1回・タイムランキング)

**構成**: 画面 `js/ui/daily.js` →(同じサイトの `/api/...`)→ Cloudflare Pages Functions(`functions/`)→ D1(`schema.sql`)。盤面は GitHub Actions(`daily.yml`)が毎日作って、管理API `PUT /api/admin/board` で登録する。公開先: `https://minesweeperplus-6o4.pages.dev`(Git 連携の Pages)。**日付は全部サーバーの JST**(端末の時計は使わない)。盤面は 0:00 JST に切り替わる。

**API**(すべて JSON・`cache-control: no-store`。ranking だけエッジにキャッシュ):
- `GET /api/daily/status?token=` → `{day,ver,state,rules}`。rules = 今日の縛りの id の配列(爆弾の位置は含まない)。画面の「🧩 今日の縛り」ボタン(#dyu。`DYS.rules`、モーダルは modal.js の MODE='dy')がスタート前に使う。state = prep(今日の盤面なし)/new/playing/done/**maint**(更新中。まだ始めていない端末にだけ)。ver = 盤面コードのルールセット番号
- `POST /api/daily/start {token}` → `{day,code,startedAt}`。盤面を渡す唯一の場所。1日1回(409=played)。応答が届かなかった人は20秒以内なら同じ盤面を再取得できる(RETRY_MS)。503=prep。423=maint(新しく始める端末だけ断る)
- `POST /api/daily/finish {token,day,clear,name}` → `{ok,ms,rank}`。タイムはサーバーが「今−開始−CD_MS」で測る。ランキングに残るのは クリア かつ 上位20位 だけ
- `GET /api/daily/code?token=` → 今日の盤面コード。**終わった(done)端末にだけ**渡す
- `GET /api/daily/ranking` → `{today, days}`。先頭が「今日」(`today:true`・順位は見える・**`code` は常に null=今日の盤面コードは出さない**。画面は「明日から見られます」)、続けて1〜6日前(盤面コードと順位)。過去分は `?d=日付` でエッジに600秒、今日の分は `?t=日付` で60秒キャッシュ(`TODAY_CACHE_S`・`PAST_CACHE_S` は `_lib.js`)。`finish` が記録を入れたとき(と admin PUT のとき)は `dropRankCache` でキャッシュを捨てるので、クリアした本人は自分の記録がすぐ見える。Cache API が無い環境では毎回 D1 から読む
- `GET/PUT /api/admin/board`(`Authorization: Bearer DAILY_TOKEN`)。GET は `{exists:true}`(200)/`{exists:false}`(404)。PUT は `{day,code}` で登録。すでにあれば置き換え、その日の plays/ranks を消す(=みんなやり直せる)。日付は今日の −1〜+2 日だけ受け付ける
- `GET/PUT/DELETE /api/admin/maint`(`Authorization: Bearer DAILY_TOKEN`)→ メンテナンス(下記)。GET は `{today,day,phase,playBlocked,boardLocked}`、PUT は `{day}` で予約(今日〜+30日。実行中は 409)、DELETE は解除
- `GET /ping` → `{ok,binding,tables,maint,token}`(D1 の DB 結合・テーブル有無・メンテ用テーブルの有無・DAILY_TOKEN の有無。値は返さない)。動作確認用。`maint` は `tables` に混ぜない(schema.sql 未実行でも既存の workflow が止まらないように)

**古いルールセット番号の盤面コード**: ランキング画面と「盤面入手」は、コードの番号 < BOARD_VER(`bcOld`)なら、コードを出さず「🔒 バージョンアップのため利用できません」と表示する。フリープレイの貼り付け欄(`freecode.js`)も同じ理由で断る。

**サーバーへの定期通信(最小限)**: 画面が「準備中(prep)」「更新中(maint)」「エラー(err)」のときだけ、60秒ごと(`DAILY_UI.pollMs`)に `/api/daily/status` を取り直す。**タブが見えていない間は通信しない**(`dyPoll`)。見えるようになったとき(`visibilitychange` / `focus` / `pageshow`。5秒以内の連続は無視)と、0:00(JST)の直後(見えているタブだけ)にも1回取り直す。ランキングは画面を開いたときだけ読む。

**連勝記録(デイリー欄の「🔥 N連勝」。この端末だけ・localStorage `msv.dailyStreak`)**: デイリーを**続けて何回クリアしたか**。日付は関係なく、遊ばない日があっても途切れない。ミスで 0。保存は `{n,pend,won}`。ズル対策は「**始めたのに結果が残っていない=ミス**」の一点で、サーバーの1日1回とは別に端末側でも持つ:
- 盤面を受け取った瞬間に `pend=その日` を保存(`dyStreakStart`)。リロード・タブを閉じる・アプリを落とす・圏外にして放置、どれでも次に開いたとき(window load の `dyAbandon`)に pend が残っていれば 0。
- ミスは `dyEnd` で**通信の前に** 0 で保存。クリアは `dyEnd` で `won=1` と控えるだけで、**サーバーが受け付けた(`dySend` の ok / 通信エラー後の409)ときだけ +1**。通信エラーなしの409・その他の4xx・送信失敗のまま閉じる、は数えない(送信失敗のまま「戻る」「閉じる」はミス)。
- クリアを控えたまま閉じた場合だけは、次の status で「同じ日で state=done」と分かれば +1、それ以外はミス(`dySettle`)。pend がその日と合わないクリアは数えない。
- 端末の保存を消す/別端末は数えられない(アカウントなし方針なので許容)。
- 検査は `node tools/daily-streak.js`(分岐)と `tools/daily-e2e.js`(画面の通し)。

**画面の状態**: DYS.state = ''(読み込み中)/new/prep/**maint**/done/err。maint は「🛠 更新中のため遊べません」+ボタン「更新中(タップで更新)」(スタート・ニックネーム欄は隠す)。途中で離れて戻った(サーバー上 playing)人はミス扱いで終了(finish clear:false)。`err` のとき、404 または「200 なのに JSON でない」は「サーバー機能が見つかりません」と表示(Pages は functions が無いと index.html を 200 で返すことがあるため)。

**盤面作り**: `daily.yml`(毎日 日本時間のAM2:33〜8:33までの計7回。対象日は「JST の明日」で、何時に走っても常に翌日分。すでに盤面があれば何もしない)。手動実行は `day`(空=自動)と `force`(作り直し)。手順: 設定確認(`/ping` が ok・binding・tables・token すべて true)→ 「すでにあるか」(`"exists":true` が返ったときだけ「ある」)→ `node tools/daily-gen.js` → PUT(HTTP 200 以外は失敗)。生成の抽選・制限時間・難易度の上限は `tools/daily-plan.js` の DAILY。

**難易度の上限(`DAILY.maxCost`、現行 16)**: `solver.js` の `deduce` は各手に `cost`=「その手を決めるのに要る配置の通りの数」を付ける(tier1 は未設定=0 扱い。全列挙の手=その成分の成り立つ配置の数 `sols`(打ち切りは Infinity)/自由マスの確定(`3c`)=他の成分の爆弾数の取りうる値の合計 / probe=固定の 4・6)。`sim` はラウンドごとに「確定できた手のうち一番易しい手の cost」を取り、盤面内の最大を `maxc` として返す。`gen` は `o.maxCost` を超える盤面を**品質未達**にする(未指定=上限なし。フリープレイ・チャレンジは未指定)。解けるかどうかの判定には使わないので盤面の意味は変わらず、BOARD_VER は上げない。
- 16 は、maxc が 9 以下と 63 以上に二極化している谷と、人間が場合分けできる目安(普通は8〜12通り、最大でも24通り程度)から決めた。高い方は縛りを4〜5個重ねた小盤面・嘘つき数字・鏡爆弾の盤面。弾かれた盤面は作り直しになり、1盤面あたり最長約60秒(上限は giveUpSec=900)。
- cost は「つながった成分全体の配置の数」で、人間が局所で解ける手も多めに数える(縛りが多い盤面ほど厳しめ)。値を上げると難しい盤面も出る。

**設定の置き場所**: GitHub の Secrets `DAILY_TOKEN`、Variables `DAILY_SITE`(`https://` から・末尾 `/` なし)。Cloudflare Pages の環境変数 `DAILY_TOKEN`(GitHub と同じ値)、Bindings の D1 変数名 `DB`。D1 に `schema.sql` を1回実行。

**不具合の切り分け順**: まず `/ping`(false が付いた項目が原因)。
1. 画面のアドレスが本番 `minesweeperplus-6o4.pages.dev` でない(プレビュー用アドレス・別ドメイン・保存したHTML)→ `/api/...` に届かず「サーバー機能が見つかりません」。
2. `functions/` のファイル名に空白・`(1)` が付く(ダウンロードして置くと付きがち)→ そのURLの機能が公開されない。
3. `DAILY_SITE` を Secrets に入れた/末尾に `/` を付けた(`//api/...` になる)。

**メンテナンス(アプデのためデイリーを止める。管理者だけ)**: D1 の `maint` テーブルに0〜1行(id=1, `day`=止め始める日 JST)。`PUT /api/admin/maint` が `CREATE TABLE IF NOT EXISTS` で自動作成するので `schema.sql` を実行しなくても動く(テーブルが無いときの `getMaint` は「なし」。`no such table` 以外のエラーは握りつぶさない)。操作は `daily-maint.yml`(action=状態を見る/予約する/解除する、day=空欄で明日)だけ。画面に管理操作は無い。
- **phase**(`_lib.js` の `maintPhase`): `none` / `reserved`(day が先) / `active`(今日==day) / `overdue`(今日>day で未解除)。
- **遊べない**(`playBlocked`)= `active` のとき(day の 0:00〜次の 0:00)。`status` は、まだ始めていない端末にだけ `maint` を返し、`start` は 423。すでに始めた/終えた端末は今までどおり。**ランキング・盤面入手(code)・finish は止めない。**
- **盤面を作らない・受け付けない**(`boardLocked`)= `active` か `overdue`(=**解除されるまで**。次の 0:00 では自動で戻らない)。`PUT /api/admin/board` は 423。`daily.yml` の「メンテナンス中ではないか」ステップが先に `GET /api/admin/maint` を見て、`active` なら schedule 実行は緑のままスキップ(`::notice::`)・手動実行は赤、`overdue` は schedule も手動も赤(解除忘れの通知)。解除後の自動作り直しは無い(古いバージョンのまま作られるのを避けるため。解除後は管理者が daily-board を手で実行)。
- 予約: day は今日〜+30日(今日=今すぐ)。`reserved` なら日付を置き換え可、`active`/`overdue` は 409(先に解除)。解除は予約の取り消しも兼ねる。解除した瞬間に遊べる・盤面も受け付ける。
- BOARD_VER とは別物。検査は `node tools/daily-e2e.js` の第11節(予約・更新中・解除・overdue・テーブル無し・画面の表示)。

**ユーザー向けの管理手順は `DAILY.md`**(仕様を変えたら必ず更新する)。

### 厳選盤面

**何か**: やりごたえのある盤面を、1日に最大3つ、全体で最大21個まで置いておく。誰でもコードをコピーして、フリープレイの盤面コード欄に貼って遊べる(ランキング・1日1回などは無し)。画面はタイトルの横の「🎯 厳選盤面」→ 一覧(作られた日(JST)ごとにまとめ、新しい日が上。各行に「縛り N」(または「縛りなし」)と「コード」ボタン。押すと「copied」)。縛りの数は盤面コードの縛り欄から数える。`bcOld` のコードは出さない(`js/ui/picks.js`)。

**構成**: `picks.yml` → `tools/pick-gen.js`(`pick-plan.js`)で生成 → `PUT /api/admin/pick` で登録(管理者。`DAILY_TOKEN`、デイリーと同じ Secrets/Variables)→ D1 `picks` → 画面が `GET /api/picks`(公開)で一覧を取る。

**生成**: `dailyPlan(false)`(サイズ・爆弾率・縛りの抽選と上限 `DAILY.maxCost` はデイリーと同じ)で抽選し、`gen` に下限 `minCost`/`minDeep`/`minDep` を渡す(`gen.js` の `qual`)。下限は縛りの有無・種類に依らない。
- `minCost`(現行6): 一番重い手が「6通り以上」。= 少なくとも1回は場合分け(背理法)が要る。上限は 16 なので「人間が解ける範囲で、場合分けが要る」帯になる。
- `minDeep`(現行3): 単一制約で進めず、全列挙が要る場面(`sim` の `deep`=詰まった回数)が3回以上。
- `minDep`(現行.15): 縛りを外すと解けなくなるマスが、安全マスの15%以上(`nec` の縛りだけが対象。数字の定義を変える縛りは対象外)。
- `pickMake` は genSec=30 で引き直し、giveUpSec=840 であきらめる(null。**失敗にしない**=厳選は出なくてもよい)。生成は1秒〜数分かかる。

**サーバー**(`functions/api/admin/pick.js`): 縛りの数・ルールセット番号・作成日は、送られた値を信じずコードと時計(JST)から決める。`PICK_PER_DAY=3`・`PICK_MAX=21`(`_lib.js`)。1文の `INSERT … SELECT … WHERE (今日の本数)<3` で入れるので、同時に届いても3を超えない。上限なら 409 `limit`、同じコードなら 200 `dup`、いまある盤面より古い番号なら 409 `old`、メンテナンス中(`boardLocked`)なら 423。入れたついでに、**ルールセット番号がそのコードより古いものと、新しい順で21個を超えたものを削除**。`GET /api/admin/pick` は `{day,count,limit,max,total,full}`(workflow が `full` で生成を省く)。`picks` テーブルは管理APIが `CREATE TABLE IF NOT EXISTS` で自動作成する(一覧は無ければ空)。`/ping` の `picks` は `tables` に混ぜない。

**workflow**(`picks.yml`): 毎日 UTC 0,4,8,12,16,20 時の47分(JST 9:47, 13:47, 17:47, 21:47, 1:47, 5:47)。手動実行も可(上限はサーバーが守る)。手順: 設定確認 → メンテ中なら何もしない → 今日の枠が `full` なら何もしない → 生成 → (ファイルがあれば)送る。見つからなかった回・枠が埋まった回・メンテ中は **緑のまま**。`concurrency` で同時に2つ走らない。

**BOARD_VER**: 盤面の意味は変わらないので上げない。ルールの意味を変えて上げたときは、次に新しい番号の厳選盤面が入った時点で古い番号のものが消える(それまでも画面は古い番号を出さない)。

**調整**: 難しさの下限は `PICK`(上げるほど歯ごたえ重視で、生成に時間がかかり、出る回が減る)。出る頻度は `picks.yml` の cron(1日の上限は `_lib.js` の `PICK_PER_DAY`)。

**検査**: `node tools/daily-e2e.js` の末尾(登録・1日3つ・21個・古い番号・メンテ中・テーブル無し・画面の表示とコピー)。生成そのものは `node tools/pick-gen.js out.json`(手元で動く)。

## 12. 多言語(日本語 / 英語)

**URL**: `/` は日本語(自動振り分けはしない)、`/ja` も日本語、`/en` が英語。中身は同じ `index.html` で、言語は URL で決まる(`js/i18n.js` の `LANG`)。`functions/en.js` と `functions/ja.js` が、アドレスはそのままで `index.html` を返す(`_redirects` は使わない。Pages が `/` に飛ばしてしまい英語にならない)。`/en/` のように末尾スラッシュだと相対パス(`js/…` `css/…`)がずれるので、`index.html` の先頭の小さなスクリプトが、そのときだけ `<base href="/">` を足す(file:// では足さない)。ローカルや確認用は `index.html?lang=en`(`?lang=ja`)。設定画面の右上に言語リンク(`#lja` `#len`。`data-nt` つき=置き換え対象外)。

**文言の通し方**
- 画面に出す文は `tx('日本語の文')`。**日本語のときは文がそのまま返る**ので日本語の見た目は変わらない。英語のときだけ `js/i18n-en.js` の `I18N_EN['日本語の文']` に置き換わる。キーは一字一句同じにする(違うと日本語のまま出る。英語のときコンソールに `[i18n] 未翻訳` が出る)。
- 数字や名前は連結せず `tx('第{n}盤面',{n:3})` のように `{名前}` で差し込む(英語は語順が違うため)。複数形・場合分けが要る英語の値だけ関数 `p=>'…'` にする。日本語の文の中の分岐は、文ごと別のキーにする(`tx(a?'文A':'文B')`)。
- `index.html` に最初から書いてある文は、起動時に `i18nDom` が一括で置き換える(テキスト・`title`・`placeholder`)。文の途中に `<b>` などが入る要素は `data-h` をつける(要素の中身ぜんぶが1つのキー)。置き換えたくない所(検査レポート・言語リンク)は `data-nt`。
- 縛りの名前・説明・why は `rname(r)` / `rdesc(r)` / `rwhy(r)`(`r.name` 等を直接出さない)。英語は `I18N_RULES[id]={name,desc,why}`。
- `tx` という名前は他の用途に使わない(関数内のローカル変数名にも使わない)。`core/` は触らない。
- 英語の文を直したら `node tools/i18n-check.js`(未翻訳・`{名前}` の過不足・関数の訳のエラーを検査)。

## 13. 盤面の見た目とドット絵アイコン(見た目のみ。BOARD_VER は上げない)

**盤面(オセロ風)**
- `#g`(本番)と `.mini`(縛りの例盤面)は共通の CSS。盤全体が1枚の面(背景=線の色 `--gl`、padding 2px、角丸6px、薄い影)で、マスは `gap:1px` で区切る。**全マス同じ色**(未開 `--c`、開いたマス `--o`、爆発 `--bad`)。マス自体に角丸・グラデーション・影は付けない。
- **市松模様にしない**(色つきマス `wt` の橙の塗り `WTST` が市松に見えるルールがあるため)。
- 色変数は `:root` の `--c`(未開マス。ライト #c2c8dc / ダーク #444a62)と `--gl`(線。#8f96b3 / #2c2f3e)。`--c1` `--c2` は今の盤面では使わないが、ほかで使う可能性があるので消さない。
- マスの大きさ(`--s`)は board.js の `s`。線の分(1px×(C-1)+4px)は計算に入れていないので、狭い画面の24×24では数pxはみ出すことがある。

**ドット絵アイコン**
- 12×12 の絵を SVG(`viewBox 0 0 12 12`、`shape-rendering='crispEdges'`、同じ色の横の連なりを1つの `<path>`)にして、CSS の `background-image:url("data:image/svg+xml,…")` で敷く。画像ファイルは無い。クラスは `.px` + 種類: `bm`爆弾 `fg`旗 `ex`爆発 `pk`つるはし `bl`電球 `pz`パズル `ht`ハート。
- `.px` は `pointer-events:none`。クリックがマス/ボタン本体に届く(`#g` のクリックは `e.target.dataset.i` を読むので、外すと押せなくなる。マークの `.mk` も同じ)。
- 置き方: マスの中=`<i class="px bm"></i>`(マスの74%)。文字の横=`.inl` を足す(`1.15em` 角)。マーク=旗に `.mk`(既存の hue-rotate で青くなる)。
- 絵文字→絵は `board.js` の `pxi(文字列)`。`PXI`(💣bm 🚩fg ⛏pk 💡bl 🧩pz ❤ht)で、その絵文字を `<i class="px … inl"></i>` に置き換える。**訳(`i18n-en.js`)は絵文字のまま**使える(キーも英語の文も変えない)。`innerHTML` に入れるので、通す文字列は数字と固定文だけにする。
- 静的なボタン(index.html に書いてある文): `main.js` の load で `#fo #ff #fk #pk #rv #hb #dyu` の `innerHTML` に `pxi` をかける(i18nDom の英語化のあと)。`#fk` の `<span class="mk">🚩</span>` は先に `<i class="px fg mk inl">` に置き換える。
- 動的な文: `board.js` の `draw` が、`#rv` `#hb`(ボタン)と `#st` のチップ(💣残り・❤・💡)を `pxi` を通して `innerHTML` で作る。ほかの所が `#rv` / `#hb` に `textContent` を書くと絵文字に戻る。
- ダーク(`prefers-color-scheme:dark`): 爆弾と旗だけ、輪郭の色を明るくした版に差し替える。ほかは共通色。
- 新しい絵文字を絵にする手順: ①12×12 の絵を作る ②CSS に `.px.xx{background-image:…}` ③`PXI` に1行 ④使う場所を `pxi(...)` に通す(`textContent` → `innerHTML`)。文言のキーは変えない。
- 元の絵は下のとおり(同じ形に作り直すときの元)。文字=色、`.`=透明。横の連なりを `<path d="M{x} {y}h{長さ}v1h-{長さ}z"/>` にし、CSS に入れるときは `<` `>` `#` を `%3C` `%3E` `%23` にして `'` で属性を囲む。

```
爆弾 bm
..........Y.
........FYWY
.......F..Y.
...KKKKK....
..KBBBBBK...
.KBWWBBBBK..
.KBWBBBBBK..
.KBBBBBBBK..
.KBBBBBBBK..
.KBBBBBBBK..
..KBBBBBK...
...KKKKK....

旗 fg
............
...KRR......
...KRWRR....
...KRRRRRR..
...KRRRRRRRR
...KDDDDDD..
...KDDDD....
...KDD......
...K........
...K........
..KKKKK.....
.KKKKKKKK...

爆発 ex
............
.....OO.....
..OO.OO.OO..
..OYOOOOYO..
...OYWWYO...
.OOOWWWWOOO.
.OOOWWWWOOO.
...OYWWYO...
..OYOOOOYO..
..OO.OO.OO..
.....OO.....
............

つるはし pk
............
....GGGG....
..GGHHHHGG..
.GHG....GGg.
GGG....fFGGg
GG....fF.Gg.
g....fF..g..
....fF......
...fF.......
..fF........
.fF.........
fF..........

電球 bl
...OOOOOO...
..OYYYYYYO..
.OYWWYYYYYO.
.OYWYYYYYYO.
.OYYYYYYYYO.
.OYYYYYYYYO.
..OYYYYYYO..
...OYYYYO...
....OYYO....
....gggg....
....SSSS....
.....gg.....

パズル pz
...LLLL.....
..LPPPPP....
..LPPPPP....
...PPPP.....
LLLLLLLLLL..
LPPPPPPPPD..
LPPPPPPPPPP.
..PPPPPPPPPP
..PPPPPPPPPP
LPPPPPPPPPD.
LPPPPPPPPD..
DDDDDDDDDD..

ハート ht
............
..RRR..RRR..
.RWWRRRRRRR.
.RWRRRRRRRR.
.RRRRRRRRRD.
.RRRRRRRRRD.
..RRRRRRRD..
...RRRRRD...
....RRRD....
.....RD.....
............
............

色(文字→色)
 爆弾/旗(ライト) K=#1d2030 B=#33385a W=#ffffff Y=#ffd23f F=#a0662a R=#e5384c D=#b3243a
 爆弾/旗(ダーク) K=#c3c8de F=#d9a566(ほかはライトと同じ)
 爆発 O=#ff8a1f Y=#ffd23f W=#ffffff
 つるはし G=#8b93ad H=#dfe3f0 g=#5d6580 F=#b3772f f=#7a4e1c
 電球 O=#d99a00 Y=#ffd23f W=#ffffff g=#5d6580 S=#8b93ad
 パズル L=#a8b0ff P=#6a74ff D=#4a54d6
 ハート R=#e5384c D=#b3243a W=#ffffff
```

**絵文字のまま残している所(未実施。意図的)**: 勝ち負けの演出(`#fini` など)、チャレンジの解説文、ヒントON時の案内文の「(🧩の中)」(`msg()` が `state.js` で `textContent`)、🔄 🎯 🔥 ✅ ⚠ 📋 🏅 📅 など。
