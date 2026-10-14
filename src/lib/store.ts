import { useCallback, useEffect, useState } from 'react';
import type { GameId, StoryProgress, UserData } from '../types';

// いまは端末内（localStorage）に保存する。同期を入れるときはこのファイルだけ差し替える。
const KEY = 'game-daily-tracker:v1';

function load(): UserData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as UserData;
  } catch {
    // 壊れたデータは無視して初期状態から始める
  }
  return { dailies: {}, story: {} };
}

export function useUserData() {
  const [data, setData] = useState<UserData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // 保存できない環境（プライベートモード等）でも画面は動かす
    }
  }, [data]);

  // 別のウィンドウ（トレイのパネルとメイン画面）で変更されたら読み直す
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setData(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleDaily = useCallback((gameId: GameId, day: string) => {
    setData((d) => {
      const days = d.dailies[gameId] ?? [];
      const next = days.includes(day) ? days.filter((x) => x !== day) : [...days, day];
      return { ...d, dailies: { ...d.dailies, [gameId]: next } };
    });
  }, []);

  const saveStory = useCallback((gameId: GameId, story: Omit<StoryProgress, 'updatedAt'>) => {
    setData((d) => ({
      ...d,
      story: { ...d.story, [gameId]: { ...story, updatedAt: new Date().toISOString() } },
    }));
  }, []);

  return { data, toggleDaily, saveStory };
}

/** 1分ごとに更新される現在時刻（リセットや残り時間の再計算用） */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    // スリープ明けやパネルを開いた瞬間にも最新の時刻で表示する
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);
  return now;
}
