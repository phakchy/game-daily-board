import { useCallback, useEffect, useState } from 'react';
import type { Character, GameId, ResetKind, StoryProgress, TaskDef, UserData } from '../types';
import { PRESETS } from '../data/presets';
import { GAMES } from '../data/games';
import { periodKey, remainingTasks } from './tasks';
import { shiftDayKey } from './time';

// いまは端末内（localStorage）に保存する。同期を入れるときはこのファイルだけ差し替える。
const KEY = 'game-daily-tracker:v2';
/** 前の形式（ゲーム単位の完了だけを記録していた頃）。ストーリーメモだけ引き継ぐ */
const OLD_KEY = 'game-daily-tracker:v1';
/** 完了の記録はこの日数より古いものを捨てる */
const KEEP_DAYS = 60;

const newId = () => crypto.randomUUID();

function initialData(): UserData {
  let story: UserData['story'] = {};
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? 'null') as { story?: UserData['story'] } | null;
    story = old?.story ?? {};
  } catch {
    // 前のデータが読めなければ空から始める
  }
  const tasks: TaskDef[] = Object.entries(PRESETS).flatMap(([group, presets]) =>
    presets.filter((p) => p.initial).map((p) => ({ id: newId(), group: group as GameId, name: p.name, reset: p.reset })),
  );
  return { tasks, done: {}, story, characters: [] };
}

function load(): UserData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<UserData>;
      return {
        // 以前あった「自分の日課」など、今のゲーム一覧にない枠の日課は読み込まない
        tasks: Array.isArray(d.tasks) ? d.tasks.filter((t) => GAMES.some((g) => g.id === t.group)) : [],
        done: d.done && typeof d.done === 'object' ? d.done : {},
        story: d.story && typeof d.story === 'object' ? d.story : {},
        characters: Array.isArray(d.characters) ? d.characters : [],
      };
    }
  } catch {
    // 壊れたデータは無視して初期状態から始める
  }
  return initialData();
}

/** 古い完了記録と、消した日課の記録を捨てる */
function prune(done: UserData['done'], tasks: TaskDef[]): UserData['done'] {
  const cutoff = shiftDayKey(new Date().toISOString().slice(0, 10), -KEEP_DAYS);
  const ids = new Set(tasks.map((t) => t.id));
  const out: UserData['done'] = {};
  for (const [id, keys] of Object.entries(done)) {
    if (!ids.has(id)) continue;
    const kept = keys.filter((k) => k.replace(/^W/, '') >= cutoff);
    if (kept.length) out[id] = kept;
  }
  return out;
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

  const toggleTask = useCallback((task: TaskDef, now: Date) => {
    const key = periodKey(task, now);
    setData((d) => {
      const keys = d.done[task.id] ?? [];
      const next = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
      return { ...d, done: prune({ ...d.done, [task.id]: next }, d.tasks) };
    });
  }, []);

  /** そのゲームの残りの日課（kind を指定すると日課だけ／週課だけ）を全部完了にする */
  const completeGroup = useCallback((group: GameId, now: Date, kind?: ResetKind) => {
    setData((d) => {
      const done = { ...d.done };
      for (const t of remainingTasks(d, group, now, kind)) done[t.id] = [...(done[t.id] ?? []), periodKey(t, now)];
      return { ...d, done: prune(done, d.tasks) };
    });
  }, []);

  const addTask = useCallback((group: GameId, name: string, reset: ResetKind) => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    setData((d) => ({ ...d, tasks: [...d.tasks, { id: newId(), group, name: trimmed, reset }] }));
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Pick<TaskDef, 'name' | 'reset'>>) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const removeTask = useCallback((id: string) => {
    setData((d) => {
      const tasks = d.tasks.filter((t) => t.id !== id);
      return { ...d, tasks, done: prune(d.done, tasks) };
    });
  }, []);

  /** 同じゲームの、日課なら日課・週課なら週課の中で1つ上（-1）または下（+1）に動かす */
  const moveTask = useCallback((id: string, dir: -1 | 1) => {
    setData((d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return d;
      const same = d.tasks.filter((t) => t.group === task.group && t.reset === task.reset);
      const i = same.indexOf(task);
      const j = i + dir;
      if (j < 0 || j >= same.length) return d;
      const a = d.tasks.indexOf(same[i]);
      const b = d.tasks.indexOf(same[j]);
      const tasks = [...d.tasks];
      [tasks[a], tasks[b]] = [tasks[b], tasks[a]];
      return { ...d, tasks };
    });
  }, []);

  const saveStory = useCallback((gameId: GameId, story: Omit<StoryProgress, 'updatedAt'>) => {
    setData((d) => ({
      ...d,
      story: { ...d.story, [gameId]: { ...story, updatedAt: new Date().toISOString() } },
    }));
  }, []);

  const addCharacter = useCallback((c: Omit<Character, 'id'>) => {
    const name = c.name.trim().slice(0, 40);
    if (!name) return;
    setData((d) => ({ ...d, characters: [...d.characters, { ...c, id: newId(), name, goal: c.goal.trim().slice(0, 60) }] }));
  }, []);

  const updateCharacter = useCallback((id: string, patch: Partial<Omit<Character, 'id' | 'gameId'>>) => {
    setData((d) => ({ ...d, characters: d.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const removeCharacter = useCallback((id: string) => {
    setData((d) => ({ ...d, characters: d.characters.filter((c) => c.id !== id) }));
  }, []);

  return {
    data,
    toggleTask,
    completeGroup,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    saveStory,
    addCharacter,
    updateCharacter,
    removeCharacter,
  };
}

export type UserActions = Omit<ReturnType<typeof useUserData>, 'data'>;

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
