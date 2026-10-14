// 崩壊スターレイル・ゼンレスゾーンゼロ：ゲーム内お知らせAPI
import type { Banner, GameEvent, GameId } from '../../src/types.ts';
import { bareName, clean, getJson, htmlToText, isRecent, maxVersion, parseDateTime, parsePeriod, DAY } from './util.ts';
import type { FetchResult } from './types.ts';

interface Ann {
  ann_id: number;
  title: string;
  start_time: string;
  end_time: string;
  content?: string;
}
interface AnnGroup {
  list?: Ann[];
  type_list?: { list?: Ann[] }[];
}
interface AnnResp {
  retcode: number;
  message: string;
  data: { list?: AnnGroup[]; pic_list?: AnnGroup[]; timezone?: number };
}
/** getAnnContent は一覧と違い、お知らせがそのまま並ぶ */
interface ContentResp {
  retcode: number;
  message: string;
  data: { list?: Ann[]; pic_list?: Ann[] };
}

interface HoyoConfig {
  gameId: GameId;
  base: string;
  query: string;
  newsUrl: string;
  /** ガチャの告知タイトル */
  gachaTitle: RegExp;
  /** 告知本文からガチャ（キャラクター）を読み取る */
  parseBanners: (text: string, tz: number) => { name: string; pickup: string; period: ReturnType<typeof parsePeriod> }[];
}

function flatten(groups: AnnGroup[] = []): Ann[] {
  return groups.flatMap((g) => [...(g.list ?? []), ...(g.type_list ?? []).flatMap((t) => t.list ?? [])]);
}

async function fetchHoyo(cfg: HoyoConfig, now: Date): Promise<FetchResult> {
  const list = await getJson<AnnResp>(`${cfg.base}/getAnnList?${cfg.query}`);
  const content = await getJson<ContentResp>(`${cfg.base}/getAnnContent?${cfg.query}`);
  if (list.retcode !== 0 || content.retcode !== 0) throw new Error(`APIエラー: ${list.message || content.message}`);

  const tz = list.data.timezone ?? 8;
  const anns = [...flatten(list.data.list), ...flatten(list.data.pic_list)].map((a) => ({ ...a, title: htmlToText(a.title) }));
  const bodies = new Map<number, string>();
  for (const a of [...(content.data.list ?? []), ...(content.data.pic_list ?? [])]) {
    if (a.content) bodies.set(a.ann_id, htmlToText(a.content));
  }

  const span = (a: Ann) => {
    const s = parseDateTime(a.start_time, tz);
    const e = parseDateTime(a.end_time, tz);
    return s && e ? { s, e, days: (Date.parse(e) - Date.parse(s)) / DAY } : null;
  };

  const banners: Banner[] = [];
  const events: GameEvent[] = [];
  const messages: string[] = [];


  for (const a of anns) {
    const t = span(a);
    if (!t || t.days > 90) continue; // 常設のお知らせは除く

    if (cfg.gachaTitle.test(a.title)) {
      const body = bodies.get(a.ann_id);
      if (!body) {
        messages.push(`「${clean(a.title, 30)}」の本文を取得できませんでした`);
        continue;
      }
      for (const b of cfg.parseBanners(body, tz)) {
        if (!b.period) continue;
        banners.push({
          id: `${cfg.gameId}-${a.ann_id}-${banners.length}`,
          gameId: cfg.gameId,
          name: clean(b.name),
          pickups: [clean(bareName(b.pickup), 40)],
          // 「Ver.○.○アップデート後」のときは、このガチャ告知の掲載開始日時で代用する（目安）
          start: b.period.start ?? t.s,
          startNote: b.period.startNote,
          end: b.period.end,
          url: cfg.newsUrl,
        });
      }
      continue;
    }

    const isEvent =
      (/イベント/.test(a.title) || a.title.startsWith('「')) &&
      !/ショップ|ストア|跳躍|チャンネル|アップデート|不具合|最適化|ファンド|コラボ|アンケート/.test(a.title);
    if (isEvent && isRecent(t.e, now)) {
      const quoted = a.title.match(/「([^」]+)」/)?.[1];
      events.push({
        id: `${cfg.gameId}-e${a.ann_id}`,
        gameId: cfg.gameId,
        name: clean(quoted ?? a.title),
        start: t.s,
        end: t.e,
        url: cfg.newsUrl,
      });
    }
  }

  return {
    version: maxVersion(anns.map((a) => a.title)),
    banners: banners.filter((b) => isRecent(b.end, now)),
    events,
    messages,
    sourceUrl: cfg.newsUrl,
  };
}

export const fetchHsr = (now: Date) =>
  fetchHoyo(
    {
      gameId: 'hsr',
      base: 'https://sg-hkrpg-api.hoyoverse.com/common/hkrpg_global/announcement/api',
      query:
        'game=hkrpg&game_biz=hkrpg_global&lang=ja&bundle_id=hkrpg_global&channel_id=1&level=70&platform=pc&region=prod_official_asia&uid=800000000',
      newsUrl: 'https://hsr.hoyoverse.com/ja-jp/news',
      gachaTitle: /イベント跳躍/,
      parseBanners: (text, tz) =>
        [...text.matchAll(/イベント跳躍・キャラクター「([^」]+)」期間中、限定★5キャラクター「([^」]+)」/g)].map((m) => ({
          name: m[1],
          pickup: m[2],
          // 本文の日時はサーバー時間（アジアサーバーは UTC+8）
          period: parsePeriod(text.slice(m.index, m.index + 600), tz),
        })),
    },
    now,
  );

export const fetchZzz = (now: Date) =>
  fetchHoyo(
    {
      gameId: 'zzz',
      base: 'https://sg-announcement-static.hoyoverse.com/common/nap_global/announcement/api',
      query:
        'game=nap&game_biz=nap_global&lang=ja&bundle_id=nap_global&channel_id=1&level=60&platform=pc&region=prod_gf_jp&uid=1300000000',
      newsUrl: 'https://zenless.hoyoverse.com/ja-jp/news',
      gachaTitle: /期間限定チャンネル/,
      parseBanners: (text) =>
        [...text.matchAll(/「([^」]+)」変調詳細([\s\S]*?)(?=「[^」]+」変調詳細|$)/g)].flatMap((m) => {
          const agent = m[2].match(/限定S級エージェント「([^」]+)」/);
          // 本文の日時は「（JST）」付き
          return agent ? [{ name: m[1], pickup: agent[1], period: parsePeriod(m[2], 9) }] : [];
        }),
    },
    now,
  );
