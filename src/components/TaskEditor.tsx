import { useState } from 'react';
import type { GameId, ResetKind, TaskDef, UserData } from '../types';
import { PRESETS } from '../data/presets';
import { isTaskDone, KIND_LABEL, tasksOf } from '../lib/tasks';
import type { UserActions } from '../lib/store';

interface Props {
  group: GameId;
  data: UserData;
  now: Date;
  actions: UserActions;
}

const KINDS: ResetKind[] = ['daily', 'weekly'];

/** 日課・週課のチェックと、追加・名前の変更・並べ替え・削除 */
export function TaskEditor({ group, data, now, actions }: Props) {
  const [editing, setEditing] = useState(false);
  const all = tasksOf(data, group);
  const names = new Set(all.map((t) => t.name));

  return (
    <div className="task-editor">
      {KINDS.map((kind) => (
        <section key={kind}>
          <h3>
            {KIND_LABEL[kind]}
            <span className="muted small">（{kind === 'daily' ? '毎日' : '毎週月曜'}にリセット）</span>
          </h3>
          <TaskList tasks={tasksOf(data, group, kind)} data={data} now={now} actions={actions} editing={editing} />
          <AddTask
            kind={kind}
            onAdd={(name) => actions.addTask(group, name, kind)}
            suggestions={PRESETS[group].filter((p) => p.reset === kind && !names.has(p.name)).map((p) => p.name)}
          />
        </section>
      ))}

      {all.length > 0 && (
        <button className="link-btn" onClick={() => setEditing((v) => !v)}>
          {editing ? '編集を終える' : '名前の変更・並べ替え・日課と週課の入れ替え・削除'}
        </button>
      )}
    </div>
  );
}

function TaskList({
  tasks,
  data,
  now,
  actions,
  editing,
}: {
  tasks: TaskDef[];
  data: UserData;
  now: Date;
  actions: UserActions;
  editing: boolean;
}) {
  if (tasks.length === 0) return <p className="muted small">まだありません。下から追加できます。</p>;
  return (
    <ul className="task-list">
      {tasks.map((t, i) => {
        const done = isTaskDone(data, t, now);
        return (
          <li key={t.id} className={done ? 'done' : ''}>
            {editing ? (
              <input
                className="task-name-input"
                value={t.name}
                maxLength={40}
                onChange={(e) => actions.updateTask(t.id, { name: e.target.value })}
                onBlur={(e) => !e.target.value.trim() && actions.updateTask(t.id, { name: '名前なし' })}
                aria-label="名前"
              />
            ) : (
              <label className="task-check">
                <input type="checkbox" checked={done} onChange={() => actions.toggleTask(t, now)} />
                <span>{t.name}</span>
              </label>
            )}
            {editing && (
              <span className="task-tools">
                <select
                  value={t.reset}
                  onChange={(e) => actions.updateTask(t.id, { reset: e.target.value as ResetKind })}
                  aria-label="日課か週課か"
                >
                  <option value="daily">日課</option>
                  <option value="weekly">週課</option>
                </select>
                <button className="icon-btn" onClick={() => actions.moveTask(t.id, -1)} disabled={i === 0} aria-label="上へ">↑</button>
                <button className="icon-btn" onClick={() => actions.moveTask(t.id, 1)} disabled={i === tasks.length - 1} aria-label="下へ">↓</button>
                <button className="icon-btn danger" onClick={() => actions.removeTask(t.id)} aria-label={`${t.name}を削除`}>×</button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AddTask({ kind, onAdd, suggestions }: { kind: ResetKind; onAdd: (name: string) => void; suggestions: string[] }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const add = (n: string) => {
    if (!n.trim()) {
      setError(`${KIND_LABEL[kind]}の名前を入れてください`);
      return;
    }
    onAdd(n);
    setName('');
    setError('');
  };

  return (
    <>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          add(name);
        }}
      >
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder={kind === 'daily' ? '例：ショップで素材交換' : '例：週間ボス'}
          maxLength={40}
          aria-label={`追加する${KIND_LABEL[kind]}の名前`}
        />
        <button type="submit">追加</button>
      </form>
      {error && <div className="field-error">{error}</div>}
      {suggestions.length > 0 && (
        <div className="suggestions">
          <span className="muted small">候補：</span>
          {suggestions.map((s) => (
            <button key={s} className="chip suggest" onClick={() => add(s)}>
              ＋ {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
