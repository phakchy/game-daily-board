import type { GroupId, TaskDef, UserData } from '../types';
import { GROUPS } from '../data/games';
import { dayKey, shiftDayKey } from './time';

export function resetHourOf(group: GroupId): number {
  return GROUPS.find((g) => g.id === group)?.resetHour ?? 4;
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

export function tasksOf(data: UserData, group: GroupId): TaskDef[] {
  return data.tasks.filter((t) => t.group === group);
}

export function remainingTasks(data: UserData, group: GroupId, now: Date): TaskDef[] {
  return tasksOf(data, group).filter((t) => !isTaskDone(data, t, now));
}

/** 全体の残り件数と、残りがある枠の数 */
export function overallRemaining(data: UserData, now: Date): { remaining: number; total: number; groups: number } {
  let remaining = 0;
  let groups = 0;
  for (const g of GROUPS) {
    const r = remainingTasks(data, g.id, now).length;
    remaining += r;
    if (r > 0) groups++;
  }
  return { remaining, total: data.tasks.length, groups };
}

/**
 * 過去の日について「毎日の日課をすべて終えた枠」の数（カレンダーの達成記録用）。
 * 毎日の日課が1つもない枠は数えない。
 */
export function dailyCompletionOn(data: UserData, now: Date, offsetDays: number): { complete: number; groups: number } {
  let complete = 0;
  let groups = 0;
  for (const g of GROUPS) {
    const daily = tasksOf(data, g.id).filter((t) => t.reset === 'daily');
    if (daily.length === 0) continue;
    groups++;
    const day = shiftDayKey(dayKey(now, g.resetHour), offsetDays);
    if (daily.every((t) => (data.done[t.id] ?? []).includes(day))) complete++;
  }
  return { complete, groups };
}

export const RESET_LABEL: Record<TaskDef['reset'], string> = { daily: '毎日', weekly: '毎週' };
