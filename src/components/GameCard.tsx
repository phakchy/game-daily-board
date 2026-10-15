import type { GameDef, GameFeed, ResetKind, TaskDef, UserData } from '../types';
import { currentBanners, formatStart, upcomingBanners, versionLabel } from '../lib/feed';
import { remaining } from '../lib/time';
import { isTaskDone, KIND_LABEL, tasksOf } from '../lib/tasks';
import { charactersOf, wantedBanners } from '../lib/characters';

interface Props {
  game: GameDef;
  feed?: GameFeed;
  data: UserData;
  selected: boolean;
  now: Date;
  onToggleTask: (task: TaskDef) => void;
  onCompleteAll: (kind: ResetKind) => void;
  onSelect: () => void;
}

export function GameIcon({ game, size = 40 }: { game: Pick<GameDef, 'color' | 'short'>; size?: number }) {
  return (
    <span className="game-icon" style={{ background: game.color, width: size, height: size, fontSize: size * 0.45 }}>
      {game.short}
    </span>
  );
}

export function GameCard({ game, feed, data, selected, now, onToggleTask, onCompleteAll, onSelect }: Props) {
  const tasks = tasksOf(data, game.id);
  const allDone = tasks.length > 0 && tasks.every((t) => isTaskDone(data, t, now));

  // 終了が近いものを代表にして、残りは件数だけ出す
  const currents = currentBanners(feed, now).sort((a, b) => Date.parse(a.end ?? '9999') - Date.parse(b.end ?? '9999'));
  const current = currents[0];
  const next = upcomingBanners(feed, now)[0];
  const story = data.story[game.id];
  const characters = charactersOf(data, game.id).filter((c) => c.status !== 'done');
  const wantedIds = new Set([...wantedBanners(data, game.id, currents).values()].flat().map((c) => c.id));

  return (
    <article className={`card game-card${selected ? ' selected' : ''}${allDone ? ' all-done' : ''}`}>
      <button className="card-main" onClick={onSelect} aria-label={`${game.name}の詳細を開く`}>
        <div className="card-head">
          <GameIcon game={game} />
          <div className="card-title">
            <div className="game-name">{game.name}</div>
            <div className="muted small">
              {versionLabel(feed)}
              {feed?.status === 'error' && <span className="warn-text"> ・更新に失敗</span>}
            </div>
          </div>
          {allDone && <span className="progress-count done">✓ 完了</span>}
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
      ) : (
        !allDone && (
          <div className="tasks-left">
            {(['daily', 'weekly'] as const).map((kind) => (
              <TaskRow
                key={kind}
                kind={kind}
                tasks={tasksOf(data, game.id, kind)}
                isDone={(t) => isTaskDone(data, t, now)}
                onToggle={onToggleTask}
                onCompleteAll={() => onCompleteAll(kind)}
              />
            ))}
          </div>
        )
      )}
    </article>
  );
}

/** 「日課 1/2 [□ 結晶ソル消費] 全部完了」の1行 */
function TaskRow({
  kind,
  tasks,
  isDone,
  onToggle,
  onCompleteAll,
}: {
  kind: ResetKind;
  tasks: TaskDef[];
  isDone: (t: TaskDef) => boolean;
  onToggle: (t: TaskDef) => void;
  onCompleteAll: () => void;
}) {
  if (tasks.length === 0) return null;
  const left = tasks.filter((t) => !isDone(t));
  return (
    <div className={`task-row ${kind}`}>
      <span className="task-kind">
        {KIND_LABEL[kind]} {tasks.length - left.length}/{tasks.length}
      </span>
      {left.length === 0 ? (
        <span className="task-row-done">✓ 完了</span>
      ) : (
        <div className="chips">
          {left.map((t) => (
            <button key={t.id} className="chip task" onClick={() => onToggle(t)} title="完了にする">
              <span className="box" aria-hidden="true" />
              {t.name}
            </button>
          ))}
          {left.length > 1 && (
            <button className="complete-all" onClick={onCompleteAll}>
              全部完了
            </button>
          )}
        </div>
      )}
    </div>
  );
}
