// 鳴潮「コンテンツ紹介」の書き方（Ver.3.7 の記事を短くしたもの）で、イベントの読み取りを確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContentIntro } from './wuwa.ts';

const SAMPLE = `【メンテナンス日時＆補填について】
✦メンテナンス日時：2026年9月30日04:00 ~ 2026年9月30日11:00（UTC+8）
✦新ストーリー✦
【潮汐任務】第四章・第四幕「夢枢の有り様、心のまま生ず」
真相を探る。
✦開催期間：Ver.3.7アップデート後から常時開放
✦新イベント&コンテンツ✦
【バージョンイベント】：
ミニイベント「勇者ダンダン大乱闘」
メェステージが建設された！
✦開催期間：Ver.3.7アップデート後 ~ 2026年11月11日11:59（サーバー時間）
留まる影収集イベント「過ぎし夢の契り」
映像を記録する。
✦開催期間：Ver.3.7アップデート後から常時開放
期間限定戦闘イベント「天工の探し物」
天工職人見習いの離紗、ただいま参りました！
✦開催期間：2026年10月8日04:00 ~ 2026年10月26日03:59（サーバー時間）
【スペシャルログインボーナス】：
期間限定ログインボーナス「傍らに響く雨音のプレゼント」
毎日ログインすると加算されます。
✦開催期間：2026年10月22日10:00 ~ 2026年11月11日03:59（サーバー時間）
✦報酬内容✦
【累計1日ログイン】：金髓の波模様*5
WEBイベント「朝月の魚群」
釣りチャレンジに参加しよう！
✦開催期間：2026年10月15日10:00～2026年11月1日09:59（UTC+8）
✦ストア新商品✦
限定パック「月影のギフト」
✦販売期間：2026年10月1日04:00 ~ 2026年10月15日03:59（サーバー時間）`;

test('メンテナンス終了をバージョンアップの日時にする（UTC+8 → UTC）', () => {
  assert.equal(parseContentIntro(SAMPLE).versionStart, '2026-09-30T03:00:00.000Z');
});

test('期間限定イベントだけを読み、常時開放・ストア商品は含めない', () => {
  const names = parseContentIntro(SAMPLE).events.map((e) => e.name);
  assert.deepEqual(names, ['勇者ダンダン大乱闘', '天工の探し物', '傍らに響く雨音のプレゼント', '朝月の魚群']);
});

test('サーバー時間の期間と「アップデート後」の開始', () => {
  const [dandan, tenko] = parseContentIntro(SAMPLE).events;
  assert.equal(dandan.period.startNote, 'Ver.3.7アップデート後');
  assert.equal(dandan.period.start, null);
  assert.equal(dandan.period.end, '2026-11-11T03:59:00.000Z');
  assert.equal(tenko.period.start, '2026-10-07T20:00:00.000Z'); // 10/8 04:00 UTC+8 = 10/8 05:00 JST
  assert.equal(tenko.period.end, '2026-10-25T19:59:00.000Z');
});
