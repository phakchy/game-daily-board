import type { GameId, ResetKind, TaskDef, UserData } from '../types';
import { GAMES } from '../data/games';
import { dayKey, shiftDayKey } from './time';

export function resetHourOf(group: GameId): number {
  return GAMES.find((g) => g.id === group)?.resetHour ?? 4;
}

/**
 * その日課の「今の期間」を表すキー。
 * 毎日: リセット時刻で区切った日付。毎週: その週の月曜（リセット時刻基準）の日付に W を付けたもの。
 */
export function periodKey(task: Pick<TaskDef, 'group' | 'reset'>, now: Date): string {
  const day = dayKey(now, resetHourOf(task.group));
  if (task.reset === 'daily') return day;
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0=日曜
  return `W${shiftDayKey(day, -((dow + 6) % 7))}`;
}

export function isTaskDone(data: UserData, task: TaskDef, now: Date): boolean {
  return (data.done[task.id] ?? []).includes(periodKey(task, now));
}

/** そのゲームの日課（kind を指定すると日課だけ／週課だけ） */
export function tasksOf(data: UserData, group: GameId, kind?: ResetKind): TaskDef[] {
  return data.tasks.filter((t) => t.group === group && (!kind || t.reset === kind));
}

export function remainingTasks(data: UserData, group: GameId, now: Date, kind?: ResetKind): TaskDef[] {
  return tasksOf(data, group, kind).filter((t) => !isTaskDone(data, t, now));
}

export interface RemainingSummary {
  remaining: number;
  total: number;
  /** 残りがあるゲームの数 */
  games: number;
}

/** 全体の残り件数（kind を指定すると日課だけ／週課だけ） */
export function overallRemaining(data: UserData, now: Date, kind?: ResetKind): RemainingSummary {
  let remaining = 0;
  let total = 0;
  let games = 0;
  for (const g of GAMES) {
    const r = remainingTasks(data, g.id, now, kind).length;
    remaining += r;
    total += tasksOf(data, g.id, kind).length;
    if (r > 0) games++;
  }
  return { remaining, total, games };
}

/**
 * 過去の日について「毎日の日課をすべて終えた枠」の数（カレンダーの達成記録用）。
 * 毎日の日課が1つもない枠は数えない。
 */
export function dailyCompletionOn(data: UserData, now: Date, offsetDays: number): { complete: number; groups: number } {
  let complete = 0;
  let groups = 0;
  for (const g of GAMES) {
    const daily = tasksOf(data, g.id, 'daily');
    if (daily.length === 0) continue;
    groups++;
    const day = shiftDayKey(dayKey(now, g.resetHour), offsetDays);
    if (daily.every((t) => (data.done[t.id] ?? []).includes(day))) complete++;
  }
  return { complete, groups };
}

export const RESET_LABEL: Record<ResetKind, string> = { daily: '毎日', weekly: '毎週' };
/** 画面の見出し */
export const KIND_LABEL: Record<ResetKind, string> = { daily: '日課', weekly: '週課' };
