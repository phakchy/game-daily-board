# ソシャゲ日課ボード（GameDailyBoard）

鳴潮・崩壊スターレイル・ゼンレスゾーンゼロ・NIKKE・ブルーアーカイブの
日課チェック、ストーリーの続きのメモ、バージョン・ガチャ・イベントの日程を一か所で確認するアプリ。

- Web版（スマホ・PC）: https://phakchy.github.io/game-daily-board/
- Windows版: タスクトレイに常駐（Tauri）

日課とストーリーメモは各端末の中にだけ保存され、どこにも送信されない。

## 開発

```bash
npm install
npm run feeds     # 公式告知を取得して public/feeds.json を作る
npm run dev       # Web版（http://localhost:5173）
npm run desktop   # Windows版（開発モード）
npm test          # 告知の読み取りのテスト
```

Windows版のインストーラー: `npm run desktop:build`（`src-tauri/target/release/bundle/nsis/` にできる）

## 自動取得

`.github/workflows/pages.yml` が3時間おきに `npm run feeds` を実行し、結果を GitHub Pages に公開する。
取得元と読み取り方は `docs/feed-verification.md` を参照。

取得元は各社の公式告知（非公開API）で、個人利用を前提にしている。
