import { useState } from 'react';
import type { TaskDef, UserData } from '../types';
import { GROUPS } from '../data/games';
import { isTaskDone, overallRemaining, tasksOf } from '../lib/tasks';
import { openMainWindow } from '../lib/desktop';
import { GameIcon } from './GameCard';

interface Props {
  data: UserData;
  now: Date;
  onToggle: (task: TaskDef) => void;
}

/** トレイアイコンから開く小さなパネル。残っている日課だけを並べる */
export function Panel({ data, now, onToggle }: Props) {
  const [showDone, setShowDone] = useState(false);
  const { remaining, total, groups } = overallRemaining(data, now);

  const sections = GROUPS.map((g) => {
    const tasks = tasksOf(data, g.id);
    return { group: g, tasks, left: tasks.filter((t) => !isTaskDone(data, t, now)) };
  }).filter((s) => s.tasks.length > 0);
  const finished = sections.filter((s) => s.left.length === 0);
  const doneTasks = sections.flatMap((s) => s.tasks.filter((t) => isTaskDone(data, t, now)).map((t) => ({ t, g: s.group })));

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          {total === 0 ? (
            '日課が登録されていません'
          ) : remaining === 0 ? (
            <strong>今日の日課はすべて完了</strong>
          ) : (
            <>
              残り <strong>{remaining}件</strong>（{groups}作品）
            </>
          )}
        </div>
        <span className="progress" aria-hidden="true">
          <span style={{ width: `${total ? ((total - remaining) / total) * 100 : 0}%` }} />
        </span>
      </header>

      <div className="panel-list">
        {sections
          .filter((s) => s.left.length > 0)
          .map(({ group, left }) => (
            <section key={group.id}>
              <div className="panel-group">
                <GameIcon game={group} size={18} />
                {group.name}
              </div>
              {left.map((t) => (
                <button key={t.id} className="panel-row" onClick={() => onToggle(t)}>
                  <span className="check" aria-hidden="true" />
                  <span className="panel-name">{t.name}</span>
                  {t.reset === 'weekly' && <span className="panel-sub">週</span>}
                </button>
              ))}
            </section>
          ))}

        {finished.length > 0 && (
          <div className="panel-finished">{finished.map((s) => s.group.name).join('・')} は完了</div>
        )}

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
                  <span className="panel-sub">{g.name}</span>
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
