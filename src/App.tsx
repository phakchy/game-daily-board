import { useEffect, useState } from 'react';
import type { GameId } from './types';
import { GAMES } from './data/games';
import { dayKey } from './lib/time';
import { useNow, useUserData } from './lib/store';
import { useFeeds } from './lib/feeds-client';
import { formatDateTime } from './lib/time';
import { GameCard } from './components/GameCard';
import { GameDetail } from './components/GameDetail';
import { Timeline } from './components/Timeline';
import { Panel } from './components/Panel';
import { setTrayTooltip, windowLabel } from './lib/desktop';

type View = 'home' | 'calendar';

function useWide(): boolean {
  const query = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

export default function App() {
  const now = useNow();
  const wide = useWide();
  const { data, toggleDaily, saveStory } = useUserData();
  const { feeds, generatedAt, stale } = useFeeds();
  const [view, setView] = useState<View>('home');
  const [selected, setSelected] = useState<GameId | null>(null);

  const doneOf = (id: GameId) => {
    const g = GAMES.find((x) => x.id === id)!;
    return (data.dailies[id] ?? []).includes(dayKey(now, g.resetHour));
  };
  const doneCount = GAMES.filter((g) => doneOf(g.id)).length;
  const label = windowLabel();

  useEffect(() => {
    if (label === 'main') setTrayTooltip(`今日の日課 ${doneCount}／${GAMES.length} 完了`);
  }, [label, doneCount]);

  const select = (id: GameId) => {
    setSelected(id);
    if (!wide) setView('home');
  };

  const selectedGame = GAMES.find((g) => g.id === selected);
  const detail = selectedGame && (
    <GameDetail
      game={selectedGame}
      feed={feeds.find((f) => f.gameId === selectedGame.id)}
      story={data.story[selectedGame.id]}
      doneDays={data.dailies[selectedGame.id] ?? []}
      now={now}
      onSaveStory={(s) => saveStory(selectedGame.id, s)}
      onBack={wide ? undefined : () => setSelected(null)}
    />
  );

  const list = (
    <div className="game-list">
      {GAMES.map((g) => (
        <GameCard
          key={g.id}
          game={g}
          feed={feeds.find((f) => f.gameId === g.id)}
          story={data.story[g.id]}
          done={doneOf(g.id)}
          selected={wide && view === 'home' && selected === g.id}
          now={now}
          onToggle={() => toggleDaily(g.id, dayKey(now, g.resetHour))}
          onSelect={() => {
            setSelected(g.id);
            setView('home');
          }}
        />
      ))}
    </div>
  );

  const timeline = <Timeline games={GAMES} feeds={feeds} data={data} now={now} onSelect={select} />;

  if (label === 'panel') {
    return <Panel games={GAMES} feeds={feeds} data={data} now={now} onToggle={toggleDaily} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="summary">
          今日の日課 <strong>{doneCount}／{GAMES.length}</strong> 完了
          <span className="progress" aria-hidden="true">
            <span style={{ width: `${(doneCount / GAMES.length) * 100}%` }} />
          </span>
        </div>
        <nav className="tabs">
          <button className={view === 'home' ? 'active' : ''} onClick={() => { setView('home'); if (!wide) setSelected(null); }}>ホーム</button>
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>カレンダー</button>
        </nav>
      </header>

      {generatedAt ? (
        <div className={`notice${stale ? ' warn' : ''}`}>
          {stale ? '最新の情報を読み込めませんでした。前回の情報を表示しています' : 'ガチャ・イベント情報'}
          （{formatDateTime(generatedAt)} 取得）
        </div>
      ) : (
        <div className="notice warn">ガチャ・イベント情報がまだありません（npm run feeds で取得できます）</div>
      )}

      {wide ? (
        <main className="split">
          <aside>{list}</aside>
          <div className="pane">
            {view === 'calendar'
              ? timeline
              : detail ?? <p className="muted empty">左の一覧からゲームを選ぶと、ここで詳細の確認と編集ができます。</p>}
          </div>
        </main>
      ) : (
        <main className="single">{selected && view === 'home' ? detail : view === 'calendar' ? timeline : list}</main>
      )}
    </div>
  );
}
