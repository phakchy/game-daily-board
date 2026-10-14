import { useState } from 'react';
import type { GroupId, ResetKind, UserData } from '../types';
import { PRESETS } from '../data/presets';
import { isTaskDone, RESET_LABEL, tasksOf } from '../lib/tasks';
import type { UserActions } from '../lib/store';

interface Props {
  group: GroupId;
  data: UserData;
  now: Date;
  actions: UserActions;
}

/** 日課のチェックと、追加・名前の変更・並べ替え・削除 */
export function TaskEditor({ group, data, now, actions }: Props) {
  const tasks = tasksOf(data, group);
  const [name, setName] = useState('');
  const [reset, setReset] = useState<ResetKind>('daily');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const names = new Set(tasks.map((t) => t.name));
  const suggestions = PRESETS[group].filter((p) => !names.has(p.name));

  const add = (n: string, r: ResetKind) => {
    if (!n.trim()) {
      setError('日課の名前を入れてください');
      return;
    }
    actions.addTask(group, n, r);
    setName('');
    setError('');
  };

  return (
    <div className="task-editor">
      {tasks.length === 0 && <p className="muted small">まだ日課がありません。下から追加できます。</p>}

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
                  aria-label="日課の名前"
                />
              ) : (
                <label className="task-check">
                  <input type="checkbox" checked={done} onChange={() => actions.toggleTask(t, now)} />
                  <span>{t.name}</span>
                </label>
              )}
              {editing ? (
                <span className="task-tools">
                  <select
                    value={t.reset}
                    onChange={(e) => actions.updateTask(t.id, { reset: e.target.value as ResetKind })}
                    aria-label="リセット"
                  >
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                  </select>
                  <button className="icon-btn" onClick={() => actions.moveTask(t.id, -1)} disabled={i === 0} aria-label="上へ">↑</button>
                  <button className="icon-btn" onClick={() => actions.moveTask(t.id, 1)} disabled={i === tasks.length - 1} aria-label="下へ">↓</button>
                  <button className="icon-btn danger" onClick={() => actions.removeTask(t.id)} aria-label={`${t.name}を削除`}>×</button>
                </span>
              ) : (
                <span className="muted small">{RESET_LABEL[t.reset]}</span>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          add(name, reset);
        }}
      >
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="例：ショップで素材交換"
          maxLength={40}
          aria-label="追加する日課の名前"
        />
        <select value={reset} onChange={(e) => setReset(e.target.value as ResetKind)} aria-label="リセット">
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
        </select>
        <button type="submit">追加</button>
      </form>
      {error && <div className="field-error">{error}</div>}

      {suggestions.length > 0 && (
        <div className="suggestions">
          <span className="muted small">候補：</span>
          {suggestions.map((p) => (
            <button key={p.name} className="chip suggest" onClick={() => add(p.name, p.reset)}>
              ＋ {p.name}
              {p.reset === 'weekly' && <span className="muted"> 週</span>}
            </button>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <button className="link-btn" onClick={() => setEditing((v) => !v)}>
          {editing ? '編集を終える' : '名前の変更・並べ替え・削除'}
        </button>
      )}
    </div>
  );
}
