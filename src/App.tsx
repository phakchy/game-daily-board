import { useEffect, useState } from 'react';
import type { GroupId } from './types';
import { GAMES, GROUPS } from './data/games';
import { useNow, useUserData } from './lib/store';
import { useFeeds } from './lib/feeds-client';
import { formatDateTime } from './lib/time';
import { overallRemaining } from './lib/tasks';
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
  const [selected, setSelected] = useState<GroupId | null>(null);

  const { remaining, total, groups } = overallRemaining(data, now);
  const label = windowLabel();

  useEffect(() => {
    if (label !== 'main') return;
    setTrayTooltip(total === 0 ? 'ソシャゲ日課ボード' : remaining === 0 ? '今日の日課はすべて完了' : `残りの日課 ${remaining}件`);
  }, [label, remaining, total]);

  const select = (id: GroupId) => {
    setSelected(id);
    if (!wide) setView('home');
  };

  const selectedGroup = GROUPS.find((g) => g.id === selected);
  const detail = selectedGroup && (
    <GameDetail
      group={selectedGroup}
      feed={feeds.find((f) => f.gameId === selectedGroup.id)}
      data={data}
      now={now}
      actions={actions}
      onBack={wide ? undefined : () => setSelected(null)}
    />
  );

  const list = (
    <div className="game-list">
      {GROUPS.map((g) => (
        <GameCard
          key={g.id}
          group={g}
          feed={feeds.find((f) => f.gameId === g.id)}
          data={data}
          selected={wide && view === 'home' && selected === g.id}
          now={now}
          onToggleTask={(t) => actions.toggleTask(t, now)}
          onCompleteAll={() => actions.completeGroup(g.id, now)}
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
          {total === 0 ? (
            '日課を登録しましょう'
          ) : remaining === 0 ? (
            <strong>日課はすべて完了</strong>
          ) : (
            <>
              残りの日課 <strong>{remaining}件</strong>
              <span className="muted small">（{groups}作品）</span>
            </>
          )}
          <span className="progress" aria-hidden="true">
            <span style={{ width: `${total ? ((total - remaining) / total) * 100 : 0}%` }} />
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
