import { useEffect, useState } from 'react';
import type { GameDef, GameFeed, StoryProgress } from '../types';
import { currentBanners, feedStatusLabel, formatStart, upcomingBanners, versionLabel } from '../lib/feed';
import { dayKey, formatDateTime, remaining, shiftDayKey } from '../lib/time';
import { GameIcon } from './GameCard';
import { OfficialLink } from './OfficialLink';

interface Props {
  game: GameDef;
  feed?: GameFeed;
  story?: StoryProgress;
  doneDays: string[];
  now: Date;
  onSaveStory: (s: { chapter: string; memo: string }) => void;
  onBack?: () => void;
}

export function GameDetail({ game, feed, story, doneDays, now, onSaveStory, onBack }: Props) {
  const [chapter, setChapter] = useState(story?.chapter ?? '');
  const [memo, setMemo] = useState(story?.memo ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setChapter(story?.chapter ?? '');
    setMemo(story?.memo ?? '');
    setSaved(false);
  }, [game.id, story]);

  const today = dayKey(now, game.resetHour);
  const history = Array.from({ length: 14 }, (_, i) => shiftDayKey(today, i - 13));
  const current = currentBanners(feed, now);
  const upcoming = upcomingBanners(feed, now);
  const events = (feed?.events ?? []).filter((e) => Date.parse(e.end) > now.getTime());

  return (
    <section className="detail">
      {onBack && (
        <button className="back" onClick={onBack}>
          ← 一覧に戻る
        </button>
      )}
      <header className="detail-head">
        <GameIcon game={game} size={48} />
        <div>
          <h2>{game.name}</h2>
          <div className="muted small">
            {versionLabel(feed)}・日課リセット {game.resetHour}:00
          </div>
        </div>
      </header>

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

      <h3>ストーリー進捗</h3>
      <form
        className="story-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSaveStory({ chapter: chapter.trim(), memo: memo.trim() });
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

      <h3>開催中のガチャ</h3>
      {current.length === 0 && <p className="muted">なし</p>}
      {current.map((b) => (
        <div key={b.id} className="item">
          <div className="item-title">
            {b.name}
            {b.end && <span className="badge">{remaining(b.end, now)}</span>}
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
        <div key={b.id} className="item">
          <div className="item-title">
            {b.name}
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

      <h3>日課の記録（14日間）</h3>
      <div className="history" role="list">
        {history.map((d) => (
          <span
            key={d}
            role="listitem"
            className={`dot${doneDays.includes(d) ? ' on' : ''}${d === today ? ' today' : ''}`}
            title={`${d}${doneDays.includes(d) ? ' 完了' : ''}`}
          />
        ))}
      </div>
    </section>
  );
}
