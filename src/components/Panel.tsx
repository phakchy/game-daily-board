import { useState } from 'react';
import type { ResetKind, TaskDef, UserData } from '../types';
import { GAMES } from '../data/games';
import { isTaskDone, KIND_LABEL, overallRemaining, tasksOf } from '../lib/tasks';
import { hidePanel, isDesktop, openMainWindow } from '../lib/desktop';
import { RemainingSummaryView } from './ProgressBars';
import { GameIcon } from './GameCard';

interface Props {
  data: UserData;
  now: Date;
  onToggle: (task: TaskDef) => void;
}

/** トレイアイコンから開く小さなパネル。残っている日課・週課だけを並べる */
export function Panel({ data, now, onToggle }: Props) {
  const [showDone, setShowDone] = useState(false);
  const daily = overallRemaining(data, now, 'daily');
  const weekly = overallRemaining(data, now, 'weekly');

  const doneTasks = GAMES.flatMap((g) => tasksOf(data, g.id).filter((t) => isTaskDone(data, t, now)).map((t) => ({ t, g })));

  return (
    <div className="panel">
      <header className="panel-head">
        <div className="panel-summary">
          <RemainingSummaryView daily={daily} weekly={weekly} />
        </div>
        {isDesktop && (
          <button className="panel-close" onClick={hidePanel} aria-label="閉じる" title="閉じる">
            ×
          </button>
        )}
      </header>

      <div className="panel-list">
        {(['daily', 'weekly'] as ResetKind[]).map((kind) => (
          <KindSection key={kind} kind={kind} data={data} now={now} onToggle={onToggle} />
        ))}

        {doneTasks.length > 0 && (
          <>
            <button className="panel-toggle" onClick={() => setShowDone((v) => !v)}>
              {showDone ? '▾' : '▸'} 完了済み {doneTasks.length}件（タップで戻せます）
            </button>
            {showDone &&
              doneTasks.map(({ t, g }) => (
                <button key={t.id} className="panel-row done" onClick={() => onToggle(t)}>
                  <span className="check" aria-hidden="true">✓</span>
                  <span className="panel-name">{t.name}</span>
                  <span className="panel-sub">
                    {g.name}・{KIND_LABEL[t.reset]}
                  </span>
                </button>
              ))}
          </>
        )}
      </div>

      <footer className="panel-foot">
        <button onClick={openMainWindow}>全画面で開く</button>
      </footer>
    </div>
  );
}

function KindSection({ kind, data, now, onToggle }: { kind: ResetKind; data: UserData; now: Date; onToggle: (t: TaskDef) => void }) {
  const games = GAMES.map((g) => {
    const tasks = tasksOf(data, g.id, kind);
    return { game: g, tasks, left: tasks.filter((t) => !isTaskDone(data, t, now)) };
  }).filter((x) => x.tasks.length > 0);
  if (games.length === 0) return null;

  const finished = games.filter((x) => x.left.length === 0);
  return (
    <section className="panel-kind">
      <div className="panel-kind-head">{KIND_LABEL[kind]}</div>
      {games
        .filter((x) => x.left.length > 0)
        .map(({ game, left }) => (
          <div key={game.id}>
            <div className="panel-group">
              <GameIcon game={game} size={18} />
              {game.name}
            </div>
            {left.map((t) => (
              <button key={t.id} className="panel-row" onClick={() => onToggle(t)}>
                <span className="check" aria-hidden="true" />
                <span className="panel-name">{t.name}</span>
              </button>
            ))}
          </div>
        ))}
      {finished.length > 0 && (
        <div className="panel-finished">
          {finished.length === games.length ? `${KIND_LABEL[kind]}はすべて完了` : `${finished.map((x) => x.game.name).join('・')} は完了`}
        </div>
      )}
    </section>
  );
}
