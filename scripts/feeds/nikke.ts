// NIKKE：公式サイトのニュースAPI（PlayerInfinite）
import type { Banner, GameEvent } from '../../src/types.ts';
import { clean, htmlToText, isRecent, parsePeriod, postJson, toIso } from './util.ts';
import type { FetchResult } from './types.ts';

const API = 'https://na-community.playerinfinite.com/api/gpts.information_feeds_svr.InformationFeedsSvr';
const HEADERS = { 'X-AreaId': 'na', 'X-GameId': '16', 'X-Language': 'ja', 'X-Source': 'pc_web' };
const NEWS_URL = 'https://nikke-jp.com/news.html';
const articleUrl = (id: string) => `https://nikke-jp.com/newsdetail.html?content_id=${encodeURIComponent(id)}`;

interface Item {
  content_id: string;
  title: string;
  pub_timestamp: number;
  content?: string;
}
interface Resp<T> {
  code: number;
  msg: string;
  data: T;
}

/** 読みに行くアップデート告知の数（今回分と前回分） */
const MAX_UPDATE_NOTICES = 2;

interface Section {
  top: string;
  heading: string;
  body: string;
}

/** 「1. 新ニケ」「1.1 SSRニケ「…」」のような見出しで本文を区切る */
function sections(text: string): Section[] {
  const out: Section[] = [];
  let top = '';
  let current: Section | null = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^(\d{1,2})(\.\d{1,2})?\.?\s+(.+)$/);
    if (h) {
      if (!h[2]) top = h[3];
      current = { top, heading: h[3].replace(/（[^）]*修正）/g, '').trim(), body: '' };
      out.push(current);
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  return out;
}

export async function fetchNikke(now: Date): Promise<FetchResult> {
  const list = await postJson<Resp<{ info_content: Item[] }>>(
    `${API}/GetContentByLabel`,
    { language: ['ja'], gameid: '16', offset: 0, get_num: 30, ext_info_type_list: [0, 1, 2], primary_label_id: 309, content_class: 0 },
    HEADERS,
  );
  if (list.code !== 0) throw new Error(`APIエラー: ${list.msg}`);

  const updates = list.data.info_content
    .filter((c) => /^\d{1,2}月\d{1,2}日のアップデートについて/.test(c.title))
    .sort((a, b) => b.pub_timestamp - a.pub_timestamp)
    .slice(0, MAX_UPDATE_NOTICES);

  const banners: Banner[] = [];
  const events: GameEvent[] = [];
  const messages: string[] = [];
  const updateDays: string[] = [];
  const seen = new Set<string>();

  for (const u of updates) {
    const m = u.title.match(/^(\d{1,2})月(\d{1,2})日/)!;
    const year = new Date(u.pub_timestamp * 1000).getUTCFullYear();
    updateDays.push(toIso(year, +m[1], +m[2]));

    const detail = await postJson<Resp<{ content: string }>>(
      `${API}/GetContentInfoById`,
      { content_id: u.content_id, language: 'ja', gameid: '16' },
      HEADERS,
    );
    if (detail.code !== 0) {
      messages.push(`「${clean(u.title, 30)}」の本文を取得できませんでした`);
      continue;
    }
    const text = htmlToText(detail.data.content);

    for (const s of sections(text)) {
      const nikke = s.heading.match(/SSRニケ「([^」]+)」/)?.[1];
      if (nikke && /特殊募集期間/.test(s.body)) {
        const period = parsePeriod(s.body.slice(s.body.indexOf('特殊募集期間')));
        if (!period || seen.has(`b|${nikke}`)) continue;
        seen.add(`b|${nikke}`);
        banners.push({
          id: `nikke-${u.content_id.slice(0, 8)}-${banners.length}`,
          gameId: 'nikke',
          name: clean(`特殊募集「${nikke}」`),
          pickups: [clean(nikke, 40)],
          start: period.start,
          startNote: period.startNote,
          end: period.end,
          url: articleUrl(u.content_id),
        });
        continue;
      }

      const isEvent = /イベント|レイド|協同作戦/.test(`${s.top} ${s.heading}`) && !/新商品|コスチューム|ニケ$/.test(s.top);
      if (!isEvent || !/開催期間/.test(s.body)) continue;
      const period = parsePeriod(s.body.slice(s.body.indexOf('開催期間')));
      if (!period?.start || seen.has(`e|${s.heading}`)) continue;
      seen.add(`e|${s.heading}`);
      events.push({
        id: `nikke-e${u.content_id.slice(0, 8)}-${events.length}`,
        gameId: 'nikke',
        name: clean(s.heading),
        start: period.start,
        startNote: period.startNote,
        end: period.end,
        url: articleUrl(u.content_id),
      });
    }
  }

  const past = updateDays.filter((d) => Date.parse(d) <= now.getTime()).sort();
  return {
    version: null,
    updatedOn: past.length ? new Date(Date.parse(past[past.length - 1]) + 9 * 3600e3).toISOString().slice(0, 10) : null,
    banners: banners.filter((b) => isRecent(b.end, now)),
    events: events.filter((e) => isRecent(e.end, now)),
    messages,
    sourceUrl: NEWS_URL,
  };
}
