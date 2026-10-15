import { useEffect, useRef } from 'react';
import { setTrayAlert, showReminderPanel, takeStartupReminder } from './desktop';

/** この時間以上タイマーが止まっていたら、スリープから復帰したとみなす */
const SLEEP_GAP_MS = 3 * 60_000;
const CHECK_MS = 30_000;

/**
 * Windows版のメイン画面（隠れていても動いている）で使う。
 * - 残りがあればトレイアイコンに赤い点を付ける
 * - 自動起動されたときと、スリープから復帰したときに、残りがあればパネルを出したままにする
 */
export function useDesktopReminders(enabled: boolean, remaining: number): void {
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;

  useEffect(() => {
    if (enabled) setTrayAlert(remaining > 0);
  }, [enabled, remaining]);

  useEffect(() => {
    if (!enabled) return;
    void takeStartupReminder().then((startup) => {
      if (startup && remainingRef.current > 0) showReminderPanel();
    });

    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (now - last > SLEEP_GAP_MS && remainingRef.current > 0) showReminderPanel();
      last = now;
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
