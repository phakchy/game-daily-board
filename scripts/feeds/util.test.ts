// 実際の告知にあった書き方で、日時・期間の読み取りを確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, maxVersion, parseDateTime, parsePeriod } from './util.ts';

test('日本時間の日時を UTC に直す', () => {
  assert.equal(parseDateTime('2026年10月22日10:59（日本標準時）'), '2026-10-22T01:59:00.000Z');
  assert.equal(parseDateTime('2026年10月21日(水) 10:59'), '2026-10-21T01:59:00.000Z');
  assert.equal(parseDateTime('2026年10月9日5:00:00'), '2026-10-08T20:00:00.000Z');
});

test('サーバー時間（UTC+8）の日時', () => {
  assert.equal(parseDateTime('2026/11/10 15:00:00', 8), '2026-11-10T07:00:00.000Z');
  assert.equal(parseDateTime('2026-10-11 11:00:00', 8), '2026-10-11T03:00:00.000Z');
});

test('ゼンゼロ：改行をはさんだ期間', () => {
  const p = parsePeriod('イベント期間\n2026/09/30 13:00（JST）\n～\n2026/10/20 15:59（JST）\nロクシー');
  assert.deepEqual(p, { start: '2026-09-30T04:00:00.000Z', end: '2026-10-20T06:59:00.000Z' });
});

test('ブルアカ：メンテナンス後の開始', () => {
  const p = parsePeriod('▼実施期間\n2026年10月7日(水) メンテナンス後 ~ 2026年10月21日(水) 10:59\n');
  assert.equal(p?.startNote, 'メンテナンス後');
  assert.equal(p?.start, '2026-10-06T15:00:00.000Z'); // 日付だけ（時刻は呼び出し側で補う）
  assert.equal(p?.end, '2026-10-21T01:59:00.000Z');
});

test('鳴潮：バージョンアップデート後の開始（日付なし）', () => {
  const p = parsePeriod('✦開催期間✦\nVer.3.7のアップデート後 ~ 2026年10月22日10:59（日本標準時）');
  assert.deepEqual(p, { start: null, startNote: 'Ver.3.7アップデート後', end: '2026-10-22T01:59:00.000Z' });
});

test('NIKKE：全角の区切りと秒付きの終了', () => {
  const p = parsePeriod('※特殊募集期間：2026年10月8日のメンテナンス終了後～2026年10月28日23:59:59');
  assert.equal(p?.startNote, 'メンテナンス後');
  assert.equal(p?.end, '2026-10-28T14:59:59.000Z');
});

test('終了日時のない「～」は飛ばして次を探す', () => {
  const p = parsePeriod('A～B の説明\n2026/09/30 13:00 ～ 2026/10/20 15:59');
  assert.equal(p?.end, '2026-10-20T06:59:00.000Z');
});

test('スターレイル：エスケープされた <t> タグも文字だけにする', () => {
  const text = htmlToText('<p>Ver.4.6アップデート後 ～ &lt;t class="t_lc"&gt;2026/11/10 15:00:00&lt;/t&gt;</p>');
  assert.equal(text, 'Ver.4.6アップデート後 ～ 2026/11/10 15:00:00');
});

test('HTML の中のスクリプトは文字にも残さない', () => {
  assert.equal(htmlToText('<p>告知<script>alert(1)</script></p>'), '告知alert(1)');
  assert.ok(!htmlToText('&lt;img src=x onerror=alert(1)&gt;本文').includes('<'));
});

test('一番大きいバージョン', () => {
  assert.equal(maxVersion(['Ver.4.6「月」', 'Ver4.5 不具合', 'Ver.4.10 予告']), '4.10');
});
