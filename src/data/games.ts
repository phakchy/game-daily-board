import type { GameDef, GroupDef } from '../types';

// resetHour は日本時間。アジアサーバー（UTC+8）の4時リセットは日本時間5時になる。
// 根拠は docs/feed-verification.md。ゲーム内で一度確認する。
export const GAMES: GameDef[] = [
  { id: 'wuwa', name: '鳴潮', short: '鳴', color: '#5DCAA5', resetHour: 5 },
  { id: 'hsr', name: '崩壊スターレイル', short: '星', color: '#7F77DD', resetHour: 5 },
  { id: 'zzz', name: 'ゼンレスゾーンゼロ', short: 'Z', color: '#EF9F27', resetHour: 5 },
  { id: 'nikke', name: 'NIKKE', short: 'N', color: '#D85A30', resetHour: 5 },
  { id: 'bluearchive', name: 'ブルーアーカイブ', short: '青', color: '#378ADD', resetHour: 4 },
];

/** ゲームに関係ない日課の枠。毎朝4時に切り替える */
export const CUSTOM_GROUP: GroupDef = { id: 'custom', name: '自分の日課', short: '自', color: '#888780', resetHour: 4 };

export const GROUPS: GroupDef[] = [...GAMES, CUSTOM_GROUP];
