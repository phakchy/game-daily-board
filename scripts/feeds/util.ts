// 取得プログラムの共通部品：通信、HTML→文字、日時の読み取り

export const USER_AGENT = 'GameDailyBoard/0.1 (personal schedule tracker)';

export async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${new URL(url).host})`);
  return (await res.json()) as T;
}

export function postJson<T>(url: string, body: unknown, headers: Record<string, string>): Promise<T> {
  return getJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8', ...headers },
    body: JSON.stringify(body),
  });
}

const ENTITIES: Record<string, string> = {
  '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–',
};

/** 告知のHTMLを、改行を保った文字だけにする（タグや埋め込みは一切残さない） */
export function htmlToText(html: string): string {
  const once = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h\d|li|tr)>/gi, '\n')
      .replace(/<[^>]*>/g, '');
  let text = once(html);
  text = text.replace(/&(lt|gt|quot|#39|nbsp|mdash|ndash);/g, (m) => ENTITIES[m]).replace(/&amp;/g, '&');
  // &lt;t&gt; のようにエスケープされていたタグも消す
  text = once(text);
  return text
    .replace(/[ \t　]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** 画面に出す文字の長さをそろえる */
export function clean(s: string, max = 80): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** 指定したUTCとの時差（時間）の日時を ISO 8601（UTC）にする */
export function toIso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, offsetHours = 9): string {
  return new Date(Date.UTC(y, mo - 1, d, h - offsetHours, mi, s)).toISOString();
}

// 「2026/09/30 13:00」「2026年10月21日(水) 10:59」「2026-10-11 11:00:00」「2026年10月9日5:00:00」など
const DATE_TIME =
  /(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})\s*日?\s*(?:[（(][^)）]{1,4}[)）])?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const DATE_ONLY = /(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})/;

export function parseDateTime(text: string, offsetHours = 9): string | null {
  const m = text.match(DATE_TIME);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return toIso(+y, +mo, +d, +h, +mi, s ? +s : 0, offsetHours);
}

export function parseDate(text: string, offsetHours = 9): string | null {
  const m = text.match(DATE_ONLY);
  return m ? toIso(+m[1], +m[2], +m[3], 0, 0, 0, offsetHours) : null;
}

export interface Period {
  /** 開始日時。「Ver.○.○アップデート後」のように日付がないときは null */
  start: string | null;
  /** 開始が正確な日時でないときの説明（「メンテナンス後」など） */
  startNote?: string;
  end: string;
}

/**
 * 文章の中から最初の「開始 ～ 終了」を読み取る。終了日時が読めないものは飛ばす。
 * 開始は「2026年10月7日(水) メンテナンス後」「Ver.3.7のアップデート後」のような書き方にも対応する。
 */
export function parsePeriod(text: string, offsetHours = 9): Period | null {
  const flat = text.replace(/\s*[~～〜]\s*/g, ' ～ ');
  let from = 0;
  for (;;) {
    const i = flat.indexOf(' ～ ', from);
    if (i < 0) return null;
    from = i + 3;
    const lineStart = flat.lastIndexOf('\n', i) + 1;
    const lineEnd = flat.indexOf('\n', i + 3);
    const left = flat.slice(lineStart, i);
    const right = flat.slice(i + 3, lineEnd < 0 ? undefined : lineEnd);

    const end = parseDateTime(right, offsetHours);
    if (!end) continue;

    const note = /メンテナンス/.test(left)
      ? 'メンテナンス後'
      : /アップデート/.test(left)
        ? `${left.match(/Ver\.?\s*\d+\.\d+/)?.[0].replace(/\s/g, '') ?? ''}アップデート後`
        : undefined;
    const exact = note ? null : parseDateTime(left, offsetHours);
    if (exact) return { start: exact, end };
    return { start: parseDate(left, offsetHours), startNote: note, end };
  }
}

/** 文字列の並びから一番大きい「Ver.○.○」を探す */
export function maxVersion(texts: string[]): string | null {
  let best: [number, number] | null = null;
  for (const t of texts) {
    for (const m of t.matchAll(/Ver\.?\s*(\d+)\.(\d+)/g)) {
      const v: [number, number] = [+m[1], +m[2]];
      if (!best || v[0] > best[0] || (v[0] === best[0] && v[1] > best[1])) best = v;
    }
  }
  return best ? `${best[0]}.${best[1]}` : null;
}

/** 「パール（愉悦・氷）」→「パール」のように、名前の後ろの補足を外す */
export function bareName(name: string): string {
  return name.replace(/[（(][^）)]*[）)]\s*$/, '').trim();
}

const DAY = 86_400_000;

/** 終了から14日以上たったものは捨てる（カレンダーで直近の過去だけ見えるように） */
export function isRecent(end: string | null, now: Date): boolean {
  return !end || Date.parse(end) > now.getTime() - 14 * DAY;
}

export { DAY };
