-- デイリー用のテーブル(Cloudflare D1)。ダッシュボードの D1 → Console に全部貼って実行する。何度実行しても壊れない。
-- boards: 日ごとの盤面コード(GitHub Actions が毎日入れる。過去6日分だけ残す)
CREATE TABLE IF NOT EXISTS boards(day TEXT PRIMARY KEY, code TEXT NOT NULL);
-- plays: 「その日その端末がもう始めたか」の鍵だけ(token は端末が作るランダム文字列。名前も時間も入れない。昨日より古い行は消える)
CREATE TABLE IF NOT EXISTS plays(day TEXT NOT NULL, token TEXT NOT NULL, started INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,token));
-- ranks: クリアかつ上位20位だけ。21位以下になった記録はその場で消える。過去6日分だけ残す
CREATE TABLE IF NOT EXISTS ranks(day TEXT NOT NULL, name TEXT NOT NULL, ms INTEGER NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ranks_day ON ranks(day, ms, at);
