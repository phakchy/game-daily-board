import { useState } from 'react';
import type { CharacterStatus, GameFeed, GameId, UserData } from '../types';
import { charactersOf, pickupNames, STATUS_LABEL } from '../lib/characters';
import type { UserActions } from '../lib/store';

interface Props {
  gameId: GameId;
  feed?: GameFeed;
  data: UserData;
  actions: UserActions;
}

const ORDER: CharacterStatus[] = ['training', 'wanted', 'done'];

/** 育成中・欲しいキャラの記録 */
export function CharacterEditor({ gameId, feed, data, actions }: Props) {
  const characters = [...charactersOf(data, gameId)].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<CharacterStatus>('training');
  const [error, setError] = useState('');
  const listId = `pickups-${gameId}`;

  return (
    <div className="char-editor">
      {characters.length === 0 && <p className="muted small">育成中のキャラや、欲しいキャラを登録できます。</p>}

      <ul className="char-list">
        {characters.map((c) => (
          <li key={c.id} className={`status-${c.status}`}>
            <span className="char-name">{c.name}</span>
            <input
              className="char-goal"
              value={c.goal}
              maxLength={60}
              placeholder="目標（例：Lv90まで）"
              onChange={(e) => actions.updateCharacter(c.id, { goal: e.target.value })}
              aria-label={`${c.name}の目標`}
            />
            <select
              value={c.status}
              onChange={(e) => actions.updateCharacter(c.id, { status: e.target.value as CharacterStatus })}
              aria-label={`${c.name}の状態`}
            >
              {ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button className="icon-btn danger" onClick={() => actions.removeCharacter(c.id)} aria-label={`${c.name}を削除`}>×</button>
          </li>
        ))}
      </ul>

      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('キャラの名前を入れてください');
            return;
          }
          actions.addCharacter({ gameId, name, goal, status });
          setName('');
          setGoal('');
          setError('');
        }}
      >
        <input
          value={name}
          list={listId}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="キャラ名"
          maxLength={40}
          aria-label="キャラ名"
        />
        <datalist id={listId}>
          {pickupNames(feed).map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="目標（任意）" maxLength={60} aria-label="目標" />
        <select value={status} onChange={(e) => setStatus(e.target.value as CharacterStatus)} aria-label="状態">
          {ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
