import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from './desktop';

// 開いてよい公式サイトのドメイン（サブドメインも可）。
// Windows版では src-tauri/src/links.rs でも同じ確認をする。変えるときは両方そろえる。
const OFFICIAL_DOMAINS = [
  'hoyoverse.com',
  'hoyolab.com',
  'kurogames.com',
  'bluearchive.jp',
  'nikke-jp.com',
  'blablalink.com',
];

/** https で、認証情報・独自ポートを含まず、公式ドメインのURLだけを通す */
export function officialUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) ? url.href : null;
}

/** 普段使っているブラウザで開く。アプリの画面の中では開かない */
export function openOfficialUrl(url: string): void {
  if (isDesktop) {
    invoke('open_official_url', { url }).catch((e) => console.warn('リンクを開けませんでした', e));
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
