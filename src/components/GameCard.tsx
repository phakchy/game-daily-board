import type { GameDef, GameFeed, StoryProgress } from '../types';
import { currentBanners, formatStart, upcomingBanners, versionLabel } from '../lib/feed';
import { remaining } from '../lib/time';

interface Props {
  game: GameDef;
  feed?: GameFeed;
  story?: StoryProgress;
  done: boolean;
  selected: boolean;
  now: Date;
  onToggle: () => void;
  onSelect: () => void;
}

export function GameIcon({ game, size = 40 }: { game: GameDef; size?: number }) {
  return (
    <span className="game-icon" style={{ background: game.color, width: size, height: size, fontSize: size * 0.45 }}>
      {game.short}
    </span>
  );
}

export function GameCard({ game, feed, story, done, selected, now, onToggle, onSelect }: Props) {
  // 終了が近いものを代表にして、残りは件数だけ出す
  const currents = currentBanners(feed, now).sort((a, b) => Date.parse(a.end ?? '9999') - Date.parse(b.end ?? '9999'));
  const current = currents[0];
  const next = upcomingBanners(feed, now)[0];

  return (
    <article className={`card game-card${selected ? ' selected' : ''}`}>
      <button className="card-main" onClick={onSelect} aria-label={`${game.name}の詳細を開く`}>
        <div className="card-head">
          <GameIcon game={game} />
          <div>
            <div className="game-name">{game.name}</div>
            <div className="muted small">
              {versionLabel(feed)}
              {feed?.status === 'error' && <span className="warn-text"> ・更新に失敗</span>}
            </div>
          </div>
        </div>

        <dl className="facts">
          <dt>ストーリー</dt>
          <dd>{story ? `${story.chapter}　${story.memo}` : <span className="muted">未記録</span>}</dd>
          <dt>開催中</dt>
          <dd>
            {current ? (
              <>
                {current.pickups[0] ?? current.name}
                {current.end && <span className="badge">{remaining(current.end, now)}</span>}
                {currents.length > 1 && <span className="muted"> ほか{currents.length - 1}件</span>}
              </>
            ) : (
              <span className="muted">なし</span>
            )}
          </dd>
          <dt>次回</dt>
          <dd>
            {next?.start ? `${next.pickups[0] ?? next.name}　${formatStart(next)}〜` : <span className="muted">未発表</span>}
          </dd>
        </dl>
      </button>

      <button className={`daily-toggle${done ? ' done' : ''}`} onClick={onToggle} aria-pressed={done}>
        <span className="check" aria-hidden="true">{done ? '✓' : ''}</span>
        {done ? '日課完了' : '日課未完了'}
      </button>
    </article>
  );
}
