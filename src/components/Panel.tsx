import type { GameDef, GameFeed, GameId, UserData } from '../types';
import { currentBanners } from '../lib/feed';
import { dayKey, remaining } from '../lib/time';
import { openMainWindow } from '../lib/desktop';
import { GameIcon } from './GameCard';

interface Props {
  games: GameDef[];
  feeds: GameFeed[];
  data: UserData;
  now: Date;
  onToggle: (id: GameId, day: string) => void;
}

/** トレイアイコンから開く小さなパネル。今日の日課チェックに絞る */
export function Panel({ games, feeds, data, now, onToggle }: Props) {
  const isDone = (g: GameDef) => (data.dailies[g.id] ?? []).includes(dayKey(now, g.resetHour));
  const doneCount = games.filter(isDone).length;

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          今日の日課 <strong>{doneCount}／{games.length}</strong> 完了
        </div>
        <span className="progress" aria-hidden="true">
          <span style={{ width: `${(doneCount / games.length) * 100}%` }} />
        </span>
      </header>

      <ul className="panel-list">
        {games.map((g) => {
          const done = isDone(g);
          const feed = feeds.find((f) => f.gameId === g.id);
          const banner = currentBanners(feed, now)
            .filter((b) => b.end)
            .sort((a, b) => Date.parse(a.end!) - Date.parse(b.end!))[0];
          const story = data.story[g.id];
          return (
            <li key={g.id}>
              <button
                className={`panel-row${done ? ' done' : ''}`}
                onClick={() => onToggle(g.id, dayKey(now, g.resetHour))}
                aria-pressed={done}
              >
                <GameIcon game={g} size={32} />
                <span className="panel-text">
                  <span className="panel-name">{g.name}</span>
                  <span className="panel-sub">
                    {banner?.end ? `ガチャ${remaining(banner.end, now)}` : ''}
                    {banner && story ? '・' : ''}
                    {story?.chapter ?? ''}
                  </span>
                </span>
                <span className="check" aria-hidden="true">{done ? '✓' : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="panel-foot">
        <button onClick={openMainWindow}>全画面で開く</button>
      </footer>
    </div>
  );
}
