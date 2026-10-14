export type GameId = 'wuwa' | 'hsr' | 'zzz' | 'nikke' | 'bluearchive';

export interface GameDef {
  id: GameId;
  name: string;
  /** アイコン代わりの短い表記 */
  short: string;
  color: string;
  /** 日課のリセット時刻（日本時間・時） */
  resetHour: number;
}

export interface Banner {
  id: string;
  gameId: GameId;
  name: string;
  pickups: string[];
  /** ISO 8601。未発表なら null */
  start: string | null;
  /**
   * 開始が「メンテナンス後」「アップデート後」としか書かれていないときの説明。
   * このとき start はその日付の目安で、時刻は正確ではない
   */
  startNote?: string;
  end: string | null;
  /** 公式告知のURL */
  url?: string;
}

export interface GameEvent {
  id: string;
  gameId: GameId;
  name: string;
  start: string;
  startNote?: string;
  end: string;
  url?: string;
}

/** 自動取得した情報（1ゲーム分） */
export interface GameFeed {
  gameId: GameId;
  /** 「4.6」など。バージョン番号がない作品は null */
  version: string | null;
  /** バージョン番号がない作品の最終アップデート日（YYYY-MM-DD） */
  updatedOn?: string | null;
  banners: Banner[];
  events: GameEvent[];
  /** 最後に取得に成功した時刻 */
  fetchedAt: string | null;
  status: 'ok' | 'error' | 'sample';
  /** 取得や読み取りで問題があったときの説明（画面に表示する） */
  messages?: string[];
  sourceUrl?: string;
}

/** 取得プログラムが作る public/feeds.json の中身 */
export interface FeedFile {
  generatedAt: string;
  games: GameFeed[];
}

export interface StoryProgress {
  chapter: string;
  memo: string;
  updatedAt: string;
}

/** 自分で記録するデータ（同期の対象） */
export interface UserData {
  /** ゲームごとの「日課を完了した日」のキー（YYYY-MM-DD、リセット時刻基準） */
  dailies: Partial<Record<GameId, string[]>>;
  story: Partial<Record<GameId, StoryProgress>>;
}
