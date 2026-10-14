import type { Banner, Character, CharacterStatus, GameFeed, GameId, UserData } from '../types';

export const STATUS_LABEL: Record<CharacterStatus, string> = {
  training: '育成中',
  wanted: '欲しい',
  done: '育成完了',
};

/** 表記ゆれを吸収する（空白・中黒・かっこの違いを無視）。部分一致はしない（「エリ」と「エリナ」を区別する） */
const norm = (s: string) => s.replace(/[\s・：:（）()「」『』]/g, '').toLowerCase();

export function isSameCharacter(a: string, b: string): boolean {
  const x = norm(a);
  return x.length > 0 && x === norm(b);
}

export function charactersOf(data: UserData, gameId: GameId): Character[] {
  return data.characters.filter((c) => c.gameId === gameId);
}

/** 「欲しい」にしたキャラがピックアップに入っているガチャ */
export function wantedBanners(data: UserData, gameId: GameId, banners: Banner[]): Map<string, Character[]> {
  const wanted = charactersOf(data, gameId).filter((c) => c.status === 'wanted');
  const out = new Map<string, Character[]>();
  for (const b of banners) {
    const hit = wanted.filter((c) => b.pickups.some((p) => isSameCharacter(c.name, p)));
    if (hit.length) out.set(b.id, hit);
  }
  return out;
}

/** 名前の入力候補：取得したガチャ情報に出てきたピックアップ */
export function pickupNames(feed: GameFeed | undefined): string[] {
  return [...new Set((feed?.banners ?? []).flatMap((b) => b.pickups))];
}
