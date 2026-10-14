// 鳴潮：公式サイトのニュースJSON
import type { Banner } from '../../src/types.ts';
import { clean, getJson, htmlToText, isRecent, parsePeriod, toIso, DAY } from './util.ts';
import type { FetchResult } from './types.ts';

const BASE = 'https://hw-media-cdn-mingchao.kurogame.com/akiwebsite/website2.0/json/G152/jp';
const NEWS_URL = 'https://wutheringwaves.kurogames.com/jp/main/news/';
const articleUrl = (id: number) => `https://wutheringwaves.kurogames.com/jp/main/news/detail/${id}`;

interface Article {
  articleId: number;
  articleTitle: string;
  /** 掲載日時（日本時間） */
  startTime: string;
  articleContent?: string;
}

/** 読みに行くガチャ記事の数の上限（直近のものだけ） */
const MAX_GACHA_ARTICLES = 6;

export async function fetchWuwa(now: Date): Promise<FetchResult> {
  const menu = await getJson<Article[]>(`${BASE}/ArticleMenu.json`);
  const posted = (a: Article) => Date.parse(a.startTime.replace(' ', 'T') + '+09:00');

  // 「Ver.3.7「…」が、9月30日に配信開始！」から、各バージョンの配信日を集める
  const releases = new Map<string, string>();
  for (const a of menu) {
    const m = a.articleTitle.match(/Ver\.?\s*(\d+\.\d+)「[^」]*」\s*が、\s*(\d{1,2})月(\d{1,2})日に配信開始/);
    if (!m) continue;
    const postedAt = new Date(posted(a));
    const year = postedAt.getUTCFullYear() + (+m[2] < postedAt.getUTCMonth() + 1 - 6 ? 1 : 0);
    releases.set(m[1], toIso(year, +m[2], +m[3]));
  }
  const released = [...releases].filter(([, d]) => Date.parse(d) <= now.getTime());
  released.sort(([a], [b]) => {
    const [a1, a2] = a.split('.').map(Number);
    const [b1, b2] = b.split('.').map(Number);
    return b1 - a1 || b2 - a2;
  });
  const version = released[0]?.[0] ?? null;

  // 直近75日のガチャ記事（タイトルに「集音」）を新しい順に読む
  const gachaArticles = menu
    .filter((a) => /集音/.test(a.articleTitle) && posted(a) > now.getTime() - 75 * DAY)
    .sort((a, b) => posted(b) - posted(a))
    .slice(0, MAX_GACHA_ARTICLES);

  const banners: Banner[] = [];
  const messages: string[] = [];
  const seen = new Set<string>();

  for (const a of gachaArticles) {
    const detail = await getJson<Article>(`${BASE}/article/${a.articleId}.json`);
    const text = htmlToText(detail.articleContent ?? '');
    // 共鳴者（キャラクター）のガチャだけを対象にする。武器ガチャは表示しない
    for (const m of text.matchAll(/共鳴者集音（[^）]+）「([^」]+)」([\s\S]*?)(?=共鳴者集音（|武器集音（|$)/g)) {
      const pickup = m[2].match(/星5共鳴者「([^」]+)」/)?.[1];
      const period = parsePeriod(m[2]);
      if (!pickup || !period) continue;

      // 「Ver.3.7のアップデート後」は、そのバージョンの配信日で補う
      const ver = period.startNote?.match(/\d+\.\d+/)?.[0];
      const start = period.start ?? (ver && releases.get(ver)) ?? new Date(posted(a)).toISOString();
      const key = `${m[1]}|${period.end}`;
      if (seen.has(key)) continue;
      seen.add(key);

      banners.push({
        id: `wuwa-${a.articleId}-${banners.length}`,
        gameId: 'wuwa',
        name: clean(m[1]),
        pickups: [clean(pickup, 40)],
        start,
        startNote: period.startNote,
        end: period.end,
        url: articleUrl(a.articleId),
      });
    }
  }

  messages.push('イベント情報の自動取得は未対応です');

  return {
    version,
    banners: banners.filter((b) => isRecent(b.end, now)),
    events: [],
    messages,
    sourceUrl: NEWS_URL,
  };
}
