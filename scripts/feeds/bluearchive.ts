// ブルーアーカイブ：公式サイトのニュースAPI
import type { Banner, GameEvent } from '../../src/types.ts';
import { clean, getJson, htmlToText, isRecent, parsePeriod, toIso, type Period } from './util.ts';
import type { FetchResult } from './types.ts';

const LIST_URL = 'https://api-web.bluearchive.jp/api/news/list?typeId=0&pageNum=30&pageIndex=1';
const NEWS_URL = 'https://bluearchive.jp/news';
const articleUrl = (id: number) => `https://bluearchive.jp/news/newsJump/${id}`;

interface Row {
  id: number;
  title: string;
  summary: string;
  content: string;
  /** 1: イベント 2: お知らせ 3: メンテナンス */
  typeId: number;
  publishTime: number;
}

/** 日付（日本時間）を YYYY-MM-DD にする */
const jstDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 10);

export async function fetchBlueArchive(now: Date): Promise<FetchResult> {
  const res = await getJson<{ data: { rows: Row[] } }>(LIST_URL);
  const rows = res.data.rows;

  // 「メンテナンスのお知らせ（10/7 11:00 - 17:00予定）」から、日付ごとのメンテナンス終了予定を集める
  const maintenanceEnd = new Map<string, string>();
  for (const r of rows.filter((r) => r.typeId === 3)) {
    const m = r.summary.match(/(\d{1,2})\/(\d{1,2})\s*\d{1,2}:\d{2}\s*[-－~～]\s*(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const year = new Date(r.publishTime + 9 * 3600e3).getUTCFullYear();
    const end = toIso(year, +m[1], +m[2], +m[3], +m[4]);
    maintenanceEnd.set(jstDay(end), end);
  }

  // 「メンテナンス後」の開始は、その日のメンテナンス終了予定で補う
  const startOf = (p: Period) => (p.start && p.startNote ? maintenanceEnd.get(jstDay(p.start)) ?? p.start : p.start);

  const banners: Banner[] = [];
  const events: GameEvent[] = [];
  const messages: string[] = [];

  for (const r of rows) {
    const text = htmlToText(r.content);

    if (/^ピックアップ募集/.test(r.summary) || /^復刻ピックアップ募集/.test(r.summary)) {
      const period = parsePeriod(text.slice(text.indexOf('実施期間')));
      if (!period) {
        messages.push(`「${clean(r.summary, 30)}」の期間を読み取れませんでした`);
        continue;
      }
      for (const m of text.matchAll(/ピックアップ名：\s*「([^」]+)」\s*\n?\s*ピックアップ生徒：([^\n]+)/g)) {
        const students = [...m[2].matchAll(/「([^」]+)」/g)].map((s) => clean(s[1], 40));
        banners.push({
          id: `bluearchive-${r.id}-${banners.length}`,
          gameId: 'bluearchive',
          name: clean(m[1]),
          pickups: students,
          start: startOf(period),
          startNote: period.startNote,
          end: period.end,
          url: articleUrl(r.id),
        });
      }
    } else if (r.typeId === 1) {
      const period = parsePeriod(text.slice(Math.max(0, text.indexOf('開催期間'))));
      if (!period?.start) continue;
      events.push({
        id: `bluearchive-e${r.id}`,
        gameId: 'bluearchive',
        name: clean(r.summary.replace(/紹介$/, '')),
        start: startOf(period)!,
        startNote: period.startNote,
        end: period.end,
        url: articleUrl(r.id),
      });
    }
  }

  // バージョン番号はないので、直近のメンテナンス日を「更新日」にする
  const pastMaintenance = [...maintenanceEnd.values()].filter((d) => Date.parse(d) <= now.getTime()).sort();
  const updatedOn = pastMaintenance.length ? jstDay(pastMaintenance[pastMaintenance.length - 1]) : null;

  return {
    version: null,
    updatedOn,
    banners: banners.filter((b) => isRecent(b.end, now)),
    events: events.filter((e) => isRecent(e.end, now)),
    messages,
    sourceUrl: NEWS_URL,
  };
}
