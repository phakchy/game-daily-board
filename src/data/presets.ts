import type { GroupId, ResetKind } from '../types';

export interface TaskPreset {
  name: string;
  reset: ResetKind;
  /** 初めて使うときに最初から入れておくもの */
  initial?: boolean;
}

// よくある日課の候補。ゲーム内の呼び方と違うものは、アプリの中で名前を変えられる。
export const PRESETS: Record<GroupId, TaskPreset[]> = {
  wuwa: [
    { name: '結晶ソル消費', reset: 'daily', initial: true },
    { name: 'デイリー任務', reset: 'daily', initial: true },
    { name: '音骸厳選', reset: 'daily' },
    { name: '週間ボス', reset: 'weekly' },
  ],
  hsr: [
    { name: '開拓力消費', reset: 'daily', initial: true },
    { name: 'デイリー訓練', reset: 'daily', initial: true },
    { name: '歴戦余韻', reset: 'weekly' },
    { name: '模擬宇宙（週間ポイント）', reset: 'weekly' },
  ],
  zzz: [
    { name: 'バッテリー消費', reset: 'daily', initial: true },
    { name: '活躍度', reset: 'daily', initial: true },
    { name: 'ビデオ屋の営業', reset: 'daily' },
    { name: '週間ボス', reset: 'weekly' },
  ],
  nikke: [
    { name: 'デイリーミッション', reset: 'daily', initial: true },
    { name: '迎撃戦', reset: 'daily', initial: true },
    { name: '前哨基地の報酬受け取り', reset: 'daily' },
    { name: 'ソーシャルポイント送付', reset: 'daily' },
  ],
  bluearchive: [
    { name: 'AP消費', reset: 'daily', initial: true },
    { name: 'デイリー任務', reset: 'daily', initial: true },
    { name: 'カフェ（タッチ・招待）', reset: 'daily' },
    { name: '戦術対抗戦', reset: 'daily' },
  ],
  custom: [],
};
