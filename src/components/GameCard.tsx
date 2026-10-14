import type { GroupDef, GameFeed, TaskDef, UserData } from '../types';
import { currentBanners, formatStart, upcomingBanners, versionLabel } from '../lib/feed';
import { remaining } from '../lib/time';
import { isTaskDone, tasksOf } from '../lib/tasks';
import { charactersOf, wantedBanners } from '../lib/characters';

interface Props {
  group: GroupDef;
  feed?: GameFeed;
  data: UserData;
  selected: boolean;
  now: Date;
  onToggleTask: (task: TaskDef) => void;
  onCompleteAll: () => void;
  onSelect: () => void;
}

export function GameIcon({ game, size = 40 }: { game: Pick<GroupDef, 'color' | 'short'>; size?: number }) {
  return (
    <span className="game-icon" style={{ background: game.color, width: size, height: size, fontSize: size * 0.45 }}>
      {game.short}
    </span>
  );
}

export function GameCard({ group, feed, data, selected, now, onToggleTask, onCompleteAll, onSelect }: Props) {
  const isGame = group.id !== 'custom';
  const tasks = tasksOf(data, group.id);
  const left = tasks.filter((t) => !isTaskDone(data, t, now));
  const allDone = tasks.length > 0 && left.length === 0;

  // 終了が近いものを代表にして、残りは件数だけ出す
  const currents = currentBanners(feed, now).sort((a, b) => Date.parse(a.end ?? '9999') - Date.parse(b.end ?? '9999'));
  const current = currents[0];
  const next = upcomingBanners(feed, now)[0];
  const story = group.id !== 'custom' ? data.story[group.id] : undefined;
  const characters = group.id !== 'custom' ? charactersOf(data, group.id).filter((c) => c.status !== 'done') : [];
  const wantedNow = group.id !== 'custom' ? wantedBanners(data, group.id, currents) : new Map();
  const wantedIds = new Set([...wantedNow.values()].flat().map((c) => c.id));

  return (
    <article className={`card game-card${selected ? ' selected' : ''}${allDone ? ' all-done' : ''}`}>
      <button className="card-main" onClick={onSelect} aria-label={`${group.name}の詳細を開く`}>
        <div className="card-head">
          <GameIcon game={group} />
          <div className="card-title">
            <div className="game-name">{group.name}</div>
            {isGame && (
              <div className="muted small">
                {versionLabel(feed)}
                {feed?.status === 'error' && <span className="warn-text"> ・更新に失敗</span>}
              </div>
            )}
          </div>
          {tasks.length > 0 && (
            <span className={`progress-count${allDone ? ' done' : ''}`}>
              {allDone ? '✓ 完了' : `${tasks.length - left.length}/${tasks.length}`}
            </span>
          )}
        </div>

        {isGame && (
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
        )}

        {characters.length > 0 && (
          <div className="chips">
            {characters.map((c) => (
              <span key={c.id} className={`chip ${wantedIds.has(c.id) ? 'want-hit' : c.status === 'wanted' ? 'want' : 'train'}`}>
                {c.status === 'wanted' ? (wantedIds.has(c.id) ? '★ ピックアップ中: ' : '欲しい: ') : ''}
                {c.name}
                {c.goal && c.status === 'training' ? `・${c.goal}` : ''}
              </span>
            ))}
          </div>
        )}
      </button>

      {tasks.length === 0 ? (
        <button className="tasks-empty" onClick={onSelect}>
          日課を登録する
        </button>
      ) : left.length > 0 ? (
        <div className="tasks-left">
          <div className="chips">
            {left.map((t) => (
              <button key={t.id} className="chip task" onClick={() => onToggleTask(t)} title="完了にする">
                <span className="box" aria-hidden="true" />
                {t.name}
                {t.reset === 'weekly' && <span className="muted"> 週</span>}
              </button>
            ))}
          </div>
          {left.length > 1 && (
            <button className="complete-all" onClick={onCompleteAll}>
              残りを全部完了
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
