# Minesweeper Variants

- 遊ぶ: `index.html` をブラウザで開く(分割ファイルのまま動く)。単一HTMLが欲しいときは `python3 build.py` → `dist/minesweeper-variants.html`。
- ルールを足す: AI に `context.md` とやりたいことを渡す(必要なファイルは context.md 第3節の表で AI が頼んでくれる)。出てきた `rules/<id>.js` を `rules/` に置き、`python3 build.py`。
- 検査: アプリを `?repo` つきのアドレスで開く(例 `https://…/?repo` ・ローカルなら `index.html?repo`)と、設定画面下部に「検査レポート」が出る → 「ルール検査を実行」。または `node tools/headless.js`。ふだんは非表示。結果を AI に渡すと、併用の矛盾を直してもらえる。
- デイリーの管理(毎日の盤面作り・作り直し・困ったとき): `DAILY.md`。サイトの動作確認は `https://<サイト>/ping`。
