import type { Banner, GameEvent } from '../../src/types.ts';

/** 各作品の取得処理が返す内容。取得時刻や状態は呼び出し側で付ける */
export interface FetchResult {
  version: string | null;
  updatedOn?: string | null;
  banners: Banner[];
  events: GameEvent[];
  messages: string[];
  sourceUrl: string;
}
