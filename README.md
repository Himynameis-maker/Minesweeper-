# Minesweeper Variants

- 遊ぶ: `index.html` をブラウザで開く(分割ファイルのまま動く)。単一HTMLが欲しいときは `python3 build.py` → `dist/minesweeper-variants.html`。
- ルールを足す: AI に `context.md` とやりたいことを渡す(必要なファイルは context.md 第3節の表で AI が頼んでくれる)。出てきた `rules/<id>.js` を `rules/` に置き、`python3 build.py`。
- 検査: アプリの設定画面下部「検査レポート → ルール検査を実行」、または `node tools/headless.js`。結果を AI に渡すと、併用の矛盾を直してもらえる。
