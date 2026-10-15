import type { ResetKind } from '../types';
import type { RemainingSummary } from '../lib/tasks';

/** 完了の割合のバー（日課は緑、週課は紫） */
export function ProgressBar({ kind, s }: { kind: ResetKind; s: RemainingSummary }) {
  const pct = s.total ? ((s.total - s.remaining) / s.total) * 100 : 0;
  return (
    <span className={`progress ${kind}`} aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

/** 「日課 残り10 ▬▬ ／ 週課 残り0 ▬▬」 */
export function RemainingSummaryView({ daily, weekly }: { daily: RemainingSummary; weekly: RemainingSummary }) {
  const parts = [
    { kind: 'daily' as const, label: '日課', s: daily },
    { kind: 'weekly' as const, label: '週課', s: weekly },
  ].filter((p) => p.s.total > 0);
  if (parts.length === 0) return <span>日課を登録しましょう</span>;
  return (
    <span className="remaining-summary">
      {parts.map((p) => (
        <span key={p.kind} className="remaining-part">
          {p.label}{' '}
          {p.s.remaining === 0 ? <strong className="done-text">完了</strong> : <>残り <strong>{p.s.remaining}</strong></>}
          <ProgressBar kind={p.kind} s={p.s} />
        </span>
      ))}
    </span>
  );
}
