import { useEffect, useState } from 'react';
import type { Banner, GameFeed, GameId, GroupDef, UserData } from '../types';
import { currentBanners, feedStatusLabel, formatStart, upcomingBanners, versionLabel } from '../lib/feed';
import { dayKey, formatDateTime, remaining, shiftDayKey } from '../lib/time';
import { tasksOf } from '../lib/tasks';
import { wantedBanners } from '../lib/characters';
import type { UserActions } from '../lib/store';
import { GameIcon } from './GameCard';
import { OfficialLink } from './OfficialLink';
import { TaskEditor } from './TaskEditor';
import { CharacterEditor } from './CharacterEditor';

interface Props {
  group: GroupDef;
  feed?: GameFeed;
  data: UserData;
  now: Date;
  actions: UserActions;
  onBack?: () => void;
}

export function GameDetail({ group, feed, data, now, actions, onBack }: Props) {
  const gameId = group.id === 'custom' ? null : group.id;

  const today = dayKey(now, group.resetHour);
  const daily = tasksOf(data, group.id).filter((t) => t.reset === 'daily');
  const history = Array.from({ length: 14 }, (_, i) => shiftDayKey(today, i - 13)).map((d) => ({
    day: d,
    done: daily.length > 0 && daily.every((t) => (data.done[t.id] ?? []).includes(d)),
  }));

  return (
    <section className="detail">
      {onBack && (
        <button className="back" onClick={onBack}>
          ← 一覧に戻る
        </button>
      )}
      <header className="detail-head">
        <GameIcon game={group} size={48} />
        <div>
          <h2>{group.name}</h2>
          <div className="muted small">
            {gameId && `${versionLabel(feed)}・`}日課リセット {group.resetHour}:00（毎週は月曜）
          </div>
        </div>
      </header>

      {gameId && (
        <>
          <div className={`feed-status${feed?.status === 'error' ? ' error' : ''}`}>
            {feedStatusLabel(feed)}
            {feed?.fetchedAt && `・最終取得 ${formatDateTime(feed.fetchedAt)}`}
            {feed?.sourceUrl && (
              <>
                ・<OfficialLink href={feed.sourceUrl}>公式告知</OfficialLink>
              </>
            )}
          </div>
          {feed?.messages?.map((m) => (
            <div key={m} className="feed-message">{m}</div>
          ))}
        </>
      )}

      <h3>日課</h3>
      <TaskEditor group={group.id} data={data} now={now} actions={actions} />

      {gameId && (
        <>
          <h3>ストーリー進捗</h3>
          <StoryForm gameId={gameId} data={data} actions={actions} />

          <h3>育成キャラ</h3>
          <CharacterEditor gameId={gameId} feed={feed} data={data} actions={actions} />

          <GachaAndEvents gameId={gameId} feed={feed} data={data} now={now} />
        </>
      )}

      <h3>日課の記録（14日間・毎日の日課をすべて終えた日）</h3>
      <div className="history" role="list">
        {history.map((h) => (
          <span
            key={h.day}
            role="listitem"
            className={`dot${h.done ? ' on' : ''}${h.day === today ? ' today' : ''}`}
            title={`${h.day}${h.done ? ' 完了' : ''}`}
          />
        ))}
      </div>
    </section>
  );
}

function StoryForm({ gameId, data, actions }: { gameId: GameId; data: UserData; actions: UserActions }) {
  const story = data.story[gameId];
  const [chapter, setChapter] = useState(story?.chapter ?? '');
  const [memo, setMemo] = useState(story?.memo ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setChapter(story?.chapter ?? '');
    setMemo(story?.memo ?? '');
    setSaved(false);
  }, [gameId, story]);

  return (
    <form
      className="story-form"
      onSubmit={(e) => {
        e.preventDefault();
        actions.saveStory(gameId, { chapter: chapter.trim(), memo: memo.trim() });
        setSaved(true);
      }}
    >
      <label>
        章・話数
        <input value={chapter} onChange={(e) => { setChapter(e.target.value); setSaved(false); }} placeholder="第3章 5話" />
      </label>
      <label>
        続きのメモ
        <textarea value={memo} onChange={(e) => { setMemo(e.target.value); setSaved(false); }} placeholder="ボス戦の前から再開" rows={2} />
      </label>
      <div className="row">
        <button type="submit" className="primary">保存</button>
        <span className="muted small">
          {saved ? '保存しました' : story ? `最終更新 ${formatDateTime(story.updatedAt)}` : ''}
        </span>
      </div>
    </form>
  );
}

function GachaAndEvents({ gameId, feed, data, now }: { gameId: GameId; feed?: GameFeed; data: UserData; now: Date }) {
  const current = currentBanners(feed, now);
  const upcoming = upcomingBanners(feed, now);
  const events = (feed?.events ?? []).filter((e) => Date.parse(e.end) > now.getTime());
  const wanted = wantedBanners(data, gameId, [...current, ...upcoming]);

  const wantMark = (b: Banner) => {
    const hit = wanted.get(b.id);
    return hit ? <span className="badge want">★ 欲しい: {hit.map((c) => c.name).join('、')}</span> : null;
  };

  return (
    <>
      <h3>開催中のガチャ</h3>
      {current.length === 0 && <p className="muted">なし</p>}
      {current.map((b) => (
        <div key={b.id} className={`item${wanted.has(b.id) ? ' wanted' : ''}`}>
          <div className="item-title">
            {b.name}
            {b.end && <span className="badge">{remaining(b.end, now)}</span>}
            {wantMark(b)}
            <OfficialLink href={b.url}><span className="link-small">告知</span></OfficialLink>
          </div>
          <div className="muted small">
            {b.pickups.join('、')}　{formatStart(b)} 〜 {b.end ? formatDateTime(b.end) : '未定'}
          </div>
        </div>
      ))}

      <h3>次回ガチャ</h3>
      {upcoming.length === 0 && <p className="muted">未発表</p>}
      {upcoming.map((b) => (
        <div key={b.id} className={`item${wanted.has(b.id) ? ' wanted' : ''}`}>
          <div className="item-title">
            {b.name}
            {wantMark(b)}
            <OfficialLink href={b.url}><span className="link-small">告知</span></OfficialLink>
          </div>
          <div className="muted small">
            {b.start ? `${formatStart(b)} 開始` : '開始日 未発表'}
            {b.pickups.length > 0 && `　${b.pickups.join('、')}`}
          </div>
        </div>
      ))}

      <h3>開催中・予定のイベント</h3>
      {events.length === 0 && <p className="muted">なし</p>}
      {events.map((e) => (
        <div key={e.id} className="item">
          <div className="item-title">
            {e.name}
            <span className="badge">{remaining(e.end, now)}</span>
            <OfficialLink href={e.url}><span className="link-small">告知</span></OfficialLink>
          </div>
          <div className="muted small">
            {formatStart(e)} 〜 {formatDateTime(e.end)}
          </div>
        </div>
      ))}
    </>
  );
}
