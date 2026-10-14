// 5作品の公式告知を読み込み、アプリ用の public/feeds.json を作る。
// 使い方: npm run feeds
// 1作品が失敗しても他は更新し、失敗した作品は前回の内容を残して「更新に失敗」とする。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { FeedFile, GameFeed, GameId } from '../src/types.ts';
import type { FetchResult } from './feeds/types.ts';
import { fetchHsr, fetchZzz } from './feeds/hoyoverse.ts';
import { fetchWuwa } from './feeds/wuwa.ts';
import { fetchBlueArchive } from './feeds/bluearchive.ts';
import { fetchNikke } from './feeds/nikke.ts';

const OUT = new URL('../public/feeds.json', import.meta.url);

const FETCHERS: [GameId, (now: Date) => Promise<FetchResult>][] = [
  ['wuwa', fetchWuwa],
  ['hsr', fetchHsr],
  ['zzz', fetchZzz],
  ['nikke', fetchNikke],
  ['bluearchive', fetchBlueArchive],
];

async function readPrevious(): Promise<FeedFile | null> {
  try {
    return JSON.parse(await readFile(OUT, 'utf8')) as FeedFile;
  } catch {
    return null;
  }
}

async function main() {
  const now = new Date();
  const previous = await readPrevious();

  const games = await Promise.all(
    FETCHERS.map(async ([gameId, fetcher]): Promise<GameFeed> => {
      try {
        const r = await fetcher(now);
        const messages = [...r.messages];
        if (r.banners.length === 0) messages.unshift('ガチャ情報を読み取れませんでした（告知の書き方が変わった可能性があります）');
        r.banners.sort((a, b) => (a.start ? Date.parse(a.start) : Infinity) - (b.start ? Date.parse(b.start) : Infinity));
        r.events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
        return { gameId, ...r, messages, fetchedAt: now.toISOString(), status: 'ok' };
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        const prev = previous?.games.find((g) => g.gameId === gameId);
        const message = `最新の情報を取得できませんでした（${reason}）`;
        return prev
          ? { ...prev, status: 'error', messages: [message] }
          : { gameId, version: null, banners: [], events: [], fetchedAt: null, status: 'error', messages: [message] };
      }
    }),
  );

  const file: FeedFile = { generatedAt: now.toISOString(), games };
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(file, null, 2)}\n`, 'utf8');

  for (const g of games) {
    const ver = g.version ? `Ver.${g.version}` : g.updatedOn ? `${g.updatedOn} 更新` : '-';
    console.log(`${g.status === 'ok' ? 'OK ' : 'NG '} ${g.gameId.padEnd(12)} ${ver.padEnd(16)} ガチャ${g.banners.length}件 イベント${g.events.length}件`);
    for (const m of g.messages ?? []) console.log(`      - ${m}`);
  }

  if (games.every((g) => g.status === 'error')) process.exit(1);
}

await main();
