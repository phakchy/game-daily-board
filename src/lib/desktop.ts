import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Windows常駐版（Tauri）で動いているときだけ使う機能。ブラウザでは何もしない。
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function windowLabel(): string | null {
  if (isDesktop) return getCurrentWindow().label;
  // 開発中はブラウザで http://localhost:5173/?panel を開くとパネルの見た目を確認できる
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('panel')) return 'panel';
  return null;
}

export function openMainWindow(): void {
  if (isDesktop) void invoke('open_main');
}

export function setTrayTooltip(text: string): void {
  if (isDesktop) void invoke('set_tray_tooltip', { text });
}

/** トレイアイコンの赤い点（残りの日課があるとき） */
export function setTrayAlert(on: boolean): void {
  if (isDesktop) void invoke('set_tray_alert', { on });
}

/** 自動起動されたときに1回だけ true */
export async function takeStartupReminder(): Promise<boolean> {
  return isDesktop ? invoke<boolean>('take_startup_reminder') : false;
}

/** パネルを右下に出したままにする（起動時・スリープ復帰時のお知らせ） */
export function showReminderPanel(): void {
  if (isDesktop) void invoke('show_reminder_panel');
}

export function hidePanel(): void {
  if (isDesktop) void invoke('hide_panel');
}
