// 公開先（GitHub Pages）。リポジトリ名を変えたら、ここと src-tauri/tauri.conf.json の csp もそろえる。
export const PAGES_ORIGIN = 'https://phakchy.github.io';
export const PAGES_BASE = '/game-daily-board/';

/** 自動取得の結果。GitHub Actions が数時間おきに更新する */
export const REMOTE_FEEDS_URL = `${PAGES_ORIGIN}${PAGES_BASE}feeds.json`;
