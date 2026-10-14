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
