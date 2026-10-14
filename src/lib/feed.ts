import type { Banner, GameEvent, GameFeed } from '../types';
import { formatDate, formatDateTime } from './time';

export function currentBanners(feed: GameFeed | undefined, now: Date): Banner[] {
  const t = now.getTime();
  return (feed?.banners ?? []).filter(
    (b) => b.start && Date.parse(b.start) <= t && (!b.end || Date.parse(b.end) > t),
  );
}

/** 開始前のガチャ。開始日が未発表のものは後ろに並べる */
export function upcomingBanners(feed: GameFeed | undefined, now: Date): Banner[] {
  const t = now.getTime();
  return (feed?.banners ?? [])
    .filter((b) => !b.start || Date.parse(b.start) > t)
    .sort((a, b) => (a.start ? Date.parse(a.start) : Infinity) - (b.start ? Date.parse(b.start) : Infinity));
}

export function feedStatusLabel(feed: GameFeed | undefined): string {
  if (!feed) return '未取得';
  if (feed.status === 'error') return '更新に失敗';
  if (feed.status === 'sample') return 'サンプルデータ';
  return '取得済み';
}

/** 「Ver.4.6」。バージョン番号がない作品は「10/8 更新」 */
export function versionLabel(feed: GameFeed | undefined): string {
  if (feed?.version) return `Ver.${feed.version}`;
  if (feed?.updatedOn) {
    const [, m, d] = feed.updatedOn.split('-').map(Number);
    return `${m}/${d} 更新`;
  }
  return 'Ver.—';
}

/** 開始日時。「メンテナンス後」のように時刻が正確でないものは日付と説明で表す */
export function formatStart(item: Pick<Banner | GameEvent, 'start' | 'startNote'>): string {
  if (!item.start) return '未発表';
  return item.startNote ? `${formatDate(item.start)} ${item.startNote}` : formatDateTime(item.start);
}
