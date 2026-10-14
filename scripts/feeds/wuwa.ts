// 鳴潮：公式サイトのニュースJSON
import type { Banner, GameEvent } from '../../src/types.ts';
import { clean, getJson, htmlToText, isRecent, parsePeriod, toIso, DAY, type Period } from './util.ts';
import type { FetchResult } from './types.ts';

const BASE = 'https://hw-media-cdn-mingchao.kurogame.com/akiwebsite/website2.0/json/G152/jp';
const NEWS_URL = 'https://wutheringwaves.kurogames.com/jp/main/news/';
const articleUrl = (id: number) => `https://wutheringwaves.kurogames.com/jp/main/news/detail/${id}`;

/** 「サーバー時間」はアジアサーバー（UTC+8） */
const SERVER_TZ = 8;

interface Article {
  articleId: number;
  articleTitle: string;
  /** 掲載日時（日本時間） */
  startTime: string;
  articleContent?: string;
}

/** 読みに行くガチャ記事の数の上限（直近のものだけ） */
const MAX_GACHA_ARTICLES = 6;
/** 読みに行く「コンテンツ紹介」記事の数（今のバージョンと1つ前） */
const MAX_INTRO_ARTICLES = 2;

export interface ContentIntro {
  /** バージョンアップのメンテナンス終了予定（「Ver.○.○アップデート後」の開始日時） */
  versionStart: string | null;
  events: { name: string; period: Period }[];
}

/**
 * 「Ver.3.7「…」 コンテンツ紹介」の本文から、メンテナンス日時と期間限定イベントを読み取る。
 * イベントは「ミニイベント「勇者ダンダン大乱闘」→ 説明 → ✦開催期間：… ~ …（サーバー時間）」の並び。
 * 「常時開放」のものは期間限定ではないので含めない。
 */
export function parseContentIntro(text: string): ContentIntro {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 見出し「【メンテナンス日時＆補填について】」ではなく、期間が書かれた行を使う
  const maintenance = lines.find((l) => /メンテナンス日時/.test(l) && /[~～〜]/.test(l));
  const versionStart = (maintenance && parsePeriod(maintenance, SERVER_TZ)?.end) || null;

  const events: ContentIntro['events'] = [];
  let inEvents = false;
  let heading: string | null = null;
  for (const line of lines) {
    if (/^✦新イベント/.test(line)) {
      inEvents = true;
      continue;
    }
    // 「✦ストア新商品✦」など次の大見出しで終わり（開催期間・解放条件・報酬内容は区切りにしない）
    if (inEvents && /^✦(?!開催期間|解放条件|報酬)/.test(line)) inEvents = false;
    if (!inEvents) continue;

    const h = line.match(/^[^。！？「」✦【]{0,24}「([^」]+)」$/);
    if (h) {
      heading = h[1];
    } else if (heading && /^✦開催期間/.test(line)) {
      const period = parsePeriod(line, SERVER_TZ);
      if (period) events.push({ name: heading, period });
      heading = null;
    }
  }
  return { versionStart, events };
}

export async function fetchWuwa(now: Date): Promise<FetchResult> {
  const menu = await getJson<Article[]>(`${BASE}/ArticleMenu.json`);
  const posted = (a: Article) => Date.parse(a.startTime.replace(' ', 'T') + '+09:00');
  const newestFirst = (a: Article, b: Article) => posted(b) - posted(a);
  const messages: string[] = [];

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

  // 「コンテンツ紹介」記事から、バージョンアップの日時とイベントを読む
  const versionStarts = new Map<string, string>();
  const events: GameEvent[] = [];
  const seenEvents = new Set<string>();
  const intros = menu
    .filter((a) => /Ver\.?\s*\d+\.\d+「[^」]*」\s*コンテンツ紹介/.test(a.articleTitle))
    .sort(newestFirst)
    .slice(0, MAX_INTRO_ARTICLES);

  for (const a of intros) {
    const ver = a.articleTitle.match(/Ver\.?\s*(\d+\.\d+)/)![1];
    const detail = await getJson<Article>(`${BASE}/article/${a.articleId}.json`);
    const intro = parseContentIntro(htmlToText(detail.articleContent ?? ''));
    if (intro.versionStart) versionStarts.set(ver, intro.versionStart);

    for (const ev of intro.events) {
      const key = `${ev.name}|${ev.period.end}`;
      if (seenEvents.has(key)) continue;
      seenEvents.add(key);
      events.push({
        id: `wuwa-e${a.articleId}-${events.length}`,
        gameId: 'wuwa',
        name: clean(ev.name),
        start: ev.period.start ?? intro.versionStart ?? releases.get(ver) ?? new Date(posted(a)).toISOString(),
        startNote: ev.period.startNote,
        end: ev.period.end,
        url: articleUrl(a.articleId),
      });
    }
  }
  if (intros.length === 0 || events.length === 0) {
    messages.push('イベント情報を読み取れませんでした（コンテンツ紹介の記事が見つからないか、書き方が変わった可能性があります）');
  }

  // 「Ver.3.7のアップデート後」は、メンテナンス終了予定（なければ配信日）で補う
  const versionStartOf = (startNote: string | undefined) => {
    const ver = startNote?.match(/\d+\.\d+/)?.[0];
    return ver ? (versionStarts.get(ver) ?? releases.get(ver)) : undefined;
  };

  // 直近75日のガチャ記事（タイトルに「集音」）を新しい順に読む
  const gachaArticles = menu
    .filter((a) => /集音/.test(a.articleTitle) && posted(a) > now.getTime() - 75 * DAY)
    .sort(newestFirst)
    .slice(0, MAX_GACHA_ARTICLES);

  const banners: Banner[] = [];
  const seen = new Set<string>();

  for (const a of gachaArticles) {
    const detail = await getJson<Article>(`${BASE}/article/${a.articleId}.json`);
    const text = htmlToText(detail.articleContent ?? '');
    // 共鳴者（キャラクター）のガチャだけを対象にする。武器ガチャは表示しない
    for (const m of text.matchAll(/共鳴者集音（[^）]+）「([^」]+)」([\s\S]*?)(?=共鳴者集音（|武器集音（|$)/g)) {
      const pickup = m[2].match(/星5共鳴者「([^」]+)」/)?.[1];
      const period = parsePeriod(m[2]);
      if (!pickup || !period) continue;

      const key = `${m[1]}|${period.end}`;
      if (seen.has(key)) continue;
      seen.add(key);

      banners.push({
        id: `wuwa-${a.articleId}-${banners.length}`,
        gameId: 'wuwa',
        name: clean(m[1]),
        pickups: [clean(pickup, 40)],
        start: period.start ?? versionStartOf(period.startNote) ?? new Date(posted(a)).toISOString(),
        startNote: period.startNote,
        end: period.end,
        url: articleUrl(a.articleId),
      });
    }
  }

  return {
    version,
    banners: banners.filter((b) => isRecent(b.end, now)),
    events: events.filter((e) => isRecent(e.end, now)),
    messages,
    sourceUrl: NEWS_URL,
  };
}
