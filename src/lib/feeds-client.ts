import { useCallback, useEffect, useState } from 'react';
import type { FeedFile, GameFeed } from '../types';
import { REMOTE_FEEDS_URL } from '../config';
import { isDesktop } from './desktop';

// 取得プログラムが作った feeds.json を読む。読めなかったときは前回読めた内容を使う。
// Web版は同じ公開先にある feeds.json を、インストール版は公開先の最新を読む
// （インストール時に同梱したものは古くなるので、読めなかったときの予備にだけ使う）。
const LOCAL_URL = `${import.meta.env.BASE_URL}feeds.json`;
const SOURCES = isDesktop && !import.meta.env.DEV ? [REMOTE_FEEDS_URL, LOCAL_URL] : [LOCAL_URL];
const CACHE_KEY = 'game-daily-tracker:feeds';
const REFRESH_MS = 30 * 60_000;

/** 形が想定どおりかだけ確かめる（中身は文字としてしか使わない） */
function isFeedFile(x: unknown): x is FeedFile {
  const f = x as FeedFile;
  return (
    !!f &&
    typeof f.generatedAt === 'string' &&
    Array.isArray(f.games) &&
    f.games.every((g) => typeof g.gameId === 'string' && Array.isArray(g.banners) && Array.isArray(g.events))
  );
}

function readCache(): FeedFile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isFeedFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface FeedState {
  feeds: GameFeed[];
  generatedAt: string | null;
  /** 最新の feeds.json を読み込めなかった（前回の内容を表示中） */
  stale: boolean;
}

export function useFeeds(): FeedState {
  const [file, setFile] = useState<FeedFile | null>(readCache);
  const [stale, setStale] = useState(false);

  const load = useCallback(async () => {
    for (const [i, url] of SOURCES.entries()) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data: unknown = await res.json();
        if (!isFeedFile(data)) throw new Error('形式が違います');
        // 予備（同梱分）より、前回読めた最新の方が新しければそちらを残す
        const cached = readCache();
        if (i > 0 && cached && cached.generatedAt > data.generatedAt) break;
        setFile(data);
        setStale(i > 0);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // 保存できなくても表示は続ける
        }
        return;
      } catch {
        // 次の読み込み先を試す
      }
    }
    setStale(true);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  return { feeds: file?.games ?? [], generatedAt: file?.generatedAt ?? null, stale };
}
