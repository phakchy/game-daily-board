import type { GameDef, GameFeed, UserData } from '../types';
import { DAY, dayKey, remaining, shiftDayKey, startOfLocalDay } from '../lib/time';

interface Props {
  games: GameDef[];
  feeds: GameFeed[];
  data: UserData;
  now: Date;
  onSelect: (id: GameDef['id']) => void;
}

const PAST_DAYS = 7;
const TOTAL_DAYS = 28;
/** ガチャの棒1段分の高さ（px） */
const BAR_STEP = 25;
/** イベントの線1段分の高さ（px） */
const EV_STEP = 7;
/** イベントの線は多くてもこの段数まで（それ以上は重ねる） */
const MAX_EVENT_LANES = 5;

/** 期間が重なるものを別の段に振り分ける */
function laneOut<T>(items: { item: T; s: number; e: number }[], maxLanes = Infinity) {
  const laneEnds: number[] = [];
  return [...items]
    .sort((a, b) => a.s - b.s)
    .map((x) => {
      let lane = laneEnds.findIndex((end) => end <= x.s);
      if (lane < 0) lane = laneEnds.length < maxLanes ? laneEnds.length : laneEnds.indexOf(Math.min(...laneEnds));
      laneEnds[lane] = x.e;
      return { ...x, lane };
    });
}

export function Timeline({ games, feeds, data, now, onSelect }: Props) {
  const from = startOfLocalDay(new Date(now.getTime() - PAST_DAYS * DAY)).getTime();
  const to = from + TOTAL_DAYS * DAY;
  const pct = (t: number) => (Math.min(Math.max(t, from), to) - from) / (to - from) * 100;
  const nowPct = pct(now.getTime());
  const ticks = Array.from({ length: TOTAL_DAYS / 7 }, (_, i) => new Date(from + i * 7 * DAY));

  return (
    <section className="timeline card">
      <div className="legend small muted">
        <span><i className="sw cur" />開催中ガチャ</span>
        <span><i className="sw next" />次回ガチャ</span>
        <span><i className="sw ev" />イベント</span>
        <span><i className="sw now" />今日</span>
      </div>

      <div className="tl-scroll">
        <div className="tl-inner">
          <div className="tl-row tl-axis">
            <div className="tl-label" />
            <div className="tl-track">
              {ticks.map((d) => (
                <span key={d.getTime()} className="tick" style={{ left: `${pct(d.getTime())}%` }}>
                  {d.getMonth() + 1}/{d.getDate()}
                </span>
              ))}
            </div>
          </div>

          {games.map((g) => {
            const feed = feeds.find((f) => f.gameId === g.id);
            // 開始日未発表のガチャは、発表済みガチャの終了後に置く
            const lastEnd = Math.max(now.getTime(), ...(feed?.banners ?? []).filter((b) => b.end).map((b) => Date.parse(b.end!)));
            const bars = laneOut(
              (feed?.banners ?? [])
                .map((b) => ({
                  item: b,
                  s: b.start ? Date.parse(b.start) : b.end ? now.getTime() : lastEnd,
                  e: b.end ? Date.parse(b.end) : to,
                }))
                .filter((x) => x.e >= from && x.s <= to),
            );
            const evs = laneOut(
              (feed?.events ?? [])
                .map((ev) => ({ item: ev, s: Date.parse(ev.start), e: Date.parse(ev.end) }))
                .filter((x) => x.e >= from && x.s <= to),
              MAX_EVENT_LANES,
            );
            const barLanes = Math.max(1, ...bars.map((b) => b.lane + 1));
            const evTop = barLanes * BAR_STEP + 2;
            const height = evTop + Math.max(0, ...evs.map((x) => x.lane + 1)) * EV_STEP;
            return (
              <div key={g.id} className="tl-row">
                <button className="tl-label" onClick={() => onSelect(g.id)}>{g.name}</button>
                <div className="tl-track" style={{ height }}>
                  <span className="now-line" style={{ left: `${nowPct}%` }} />
                  {bars.map(({ item: b, s, e, lane }) => {
                    const tbd = !b.start && !b.end;
                    const isCurrent = !tbd && s <= now.getTime() && e > now.getTime();
                    const l = pct(s);
                    const label = tbd ? '未発表' : (b.pickups[0] ?? b.name);
                    return (
                      <span
                        key={b.id}
                        className={`bar ${tbd ? 'next tbd' : isCurrent ? 'cur' : s > now.getTime() ? 'next' : 'past'}`}
                        style={{ left: `${l}%`, width: `calc(${pct(e) - l}% - 2px)`, top: lane * BAR_STEP }}
                        title={`${b.name}${b.pickups.length ? `（${b.pickups.join('、')}）` : ''}`}
                      >
                        {label}
                        {isCurrent && b.end && ` ${remaining(b.end, now)}`}
                      </span>
                    );
                  })}
                  {evs.map(({ item: ev, s, e, lane }) => (
                    <span
                      key={ev.id}
                      className="ev-line"
                      style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%`, top: evTop + lane * EV_STEP }}
                      title={ev.name}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="tl-row">
            <div className="tl-label small muted">日課達成</div>
            <div className="tl-track daily-track">
              {Array.from({ length: PAST_DAYS + 1 }, (_, i) => {
                const offset = i - PAST_DAYS;
                const count = games.filter((g) =>
                  (data.dailies[g.id] ?? []).includes(shiftDayKey(dayKey(now, g.resetHour), offset)),
                ).length;
                const level = count === games.length ? 'full' : count >= Math.ceil(games.length / 2) ? 'half' : count > 0 ? 'low' : '';
                return (
                  <span
                    key={i}
                    className={`cell ${level}`}
                    style={{ left: `${pct(from + i * DAY)}%`, width: `calc(${100 / TOTAL_DAYS}% - 3px)` }}
                    title={`${count}/${games.length}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
