import { useEffect, useState } from 'react';
import type { GameId } from './types';
import { GAMES } from './data/games';
import { useNow, useUserData } from './lib/store';
import { useFeeds } from './lib/feeds-client';
import { formatDateTime } from './lib/time';
import { overallRemaining } from './lib/tasks';
import { useDesktopReminders } from './lib/reminder';
import { RemainingSummaryView } from './components/ProgressBars';
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
  const { data, ...actions } = useUserData();
  const { feeds, generatedAt, stale } = useFeeds();
  const [view, setView] = useState<View>('home');
  const [selected, setSelected] = useState<GameId | null>(null);

  const daily = overallRemaining(data, now, 'daily');
  const weekly = overallRemaining(data, now, 'weekly');
  const total = daily.total + weekly.total;
  const remaining = daily.remaining + weekly.remaining;
  const label = windowLabel();
  useDesktopReminders(label === 'main', remaining);

  useEffect(() => {
    if (label !== 'main') return;
    setTrayTooltip(
      total === 0 ? 'ソシャゲ日課ボード' : remaining === 0 ? '日課・週課はすべて完了' : `日課 残り${daily.remaining}・週課 残り${weekly.remaining}`,
    );
  }, [label, remaining, total, daily.remaining, weekly.remaining]);

  const select = (id: GameId) => {
    setSelected(id);
    if (!wide) setView('home');
  };

  const selectedGame = GAMES.find((g) => g.id === selected);
  const detail = selectedGame && (
    <GameDetail
      game={selectedGame}
      feed={feeds.find((f) => f.gameId === selectedGame.id)}
      data={data}
      now={now}
      actions={actions}
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
          data={data}
          selected={wide && view === 'home' && selected === g.id}
          now={now}
          onToggleTask={(t) => actions.toggleTask(t, now)}
          onCompleteAll={(kind) => actions.completeGroup(g.id, now, kind)}
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
    return <Panel data={data} now={now} onToggle={(t) => actions.toggleTask(t, now)} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="summary">
          <RemainingSummaryView daily={daily} weekly={weekly} />
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
