-- Local/dev seed: one sample 顯化 — the 10K run from the prototype.
-- Not a migration. Apply it by hand, only to a development database:
--   wrangler d1 execute clearpath --local --file=./seeds/sample-manifestation.sql
--
-- The same sample lives in TypeScript at
-- packages/core/src/seed/sample-manifestation.ts (used by tests and by the app);
-- the ids and the copy below are kept identical, and a test checks that.
-- Re-running it is safe: every row is INSERT OR IGNORE on a fixed uuid.

INSERT OR IGNORE INTO users (id, google_sub, apple_sub, email, display_name, reminder_time, created_at)
VALUES (
  '3d279fbe-7e50-40c8-ad5b-049e996258d8',
  'seed-sample-google-sub',
  NULL,
  'sample@clearpath.local',
  '小宇',
  '21:00',
  1793583000
);

INSERT OR IGNORE INTO manifestations (
  id, user_id, wish, outcome, obstacle, if_cue, then_action, steps,
  likelihood, status, start_date, created_at
)
VALUES (
  '1aa20484-0212-4c45-91b9-a6566a14ff85',
  '3d279fbe-7e50-40c8-ad5b-049e996258d8',
  '今年完成第一場 10 公里路跑',
  '我在 10 公里的終點前還能笑著加速最後 200 公尺，呼吸是穩的，腳步也還有力。',
  '下班回到家就累了，很想先躺在沙發上滑手機，然後天就黑了。',
  '如果下班回到家想先躺平',
  '我就先換上跑鞋，到樓下走 5 分鐘，再決定今天要跑多久。',
  '["週一三五 19:30 樓下慢跑 30 分鐘","出門前先做 5 分鐘熱身","週日早上跑長距離，每兩週多加 1 公里","跑完記下今天的一句話"]',
  7,
  'active',
  '2026-11-02',
  1793583000
);

-- 顯化板: one 'why' card, four 'process' cards — process gets most of the board.
INSERT OR IGNORE INTO board_items (
  id, manifestation_id, user_id, zone, kind, image_key, text, colour, when_where, position, created_at
)
VALUES
  ('bf193d18-7c5a-4d29-a4f3-9836626f8093', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 'why', 'words', NULL,
   '穩穩地跑完，不是跑贏誰', 'highlighter', NULL, 0, 1793583000),
  ('5a41a39f-26f8-4881-a2ce-90e97cc4459b', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 'process', 'words', NULL,
   '換上跑鞋就算開始', 'graph-blue', '回到家放下包包的時候', 0, 1793583000),
  ('e8856ae3-5d03-45f8-b75d-0237aecea21a', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 'process', 'words', NULL,
   '慢跑 30 分鐘', 'graph-blue', '週一三五 19:30 樓下', 1, 1793583000),
  ('c9ba8e8c-a110-4cfd-a848-361c19f852fd', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 'process', 'words', NULL,
   '先熱身 5 分鐘', 'ink', '每次出門前', 2, 1793583000),
  ('d650da40-f7a9-48be-9522-fd3a2497075b', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 'process', 'words', NULL,
   '跑完記下今天的一句話', 'coral', '洗澡前', 3, 1793583000);

-- 足跡: two 做到, one 部分做到, one 今天沒做到 — the missed day is just a fact.
INSERT OR IGNORE INTO checkins (
  id, manifestation_id, user_id, date, result, note, photo_key, cues_done
)
VALUES
  ('a46fadb7-8423-4226-ba5b-30998f64a192', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', '2026-11-02', 'did',
   '跑了 32 分鐘，最後一段還能加速。', NULL,
   '["換上跑鞋就算開始","先熱身 5 分鐘"]'),
  ('fb986b1c-f383-47f0-90a9-326d97fae4e7', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', '2026-11-04', 'partly',
   '只走到樓下走了 10 分鐘，但有出門。', NULL,
   '["換上跑鞋就算開始"]'),
  ('5c17a23b-9064-4848-abb3-56d79d633bcc', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', '2026-11-06', 'not_today',
   '加班到九點，今天沒做到。', NULL, '[]'),
  ('f28ede0b-86d7-4086-ba81-649994bec471', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', '2026-11-08', 'did',
   '早上跑了 6 公里，比上週多 1 公里。', NULL,
   '["換上跑鞋就算開始","先熱身 5 分鐘","跑完記下今天的一句話"]');

INSERT OR IGNORE INTO rehearsals (id, manifestation_id, user_id, started_at, completed)
VALUES
  ('c8f549c1-1f16-42bd-b81e-ae476c844a6a', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 1793625000, 1),
  ('03e813a6-3df2-40ed-bb56-ac88c2378ca7', '1aa20484-0212-4c45-91b9-a6566a14ff85',
   '3d279fbe-7e50-40c8-ad5b-049e996258d8', 1794100200, 1);

INSERT OR IGNORE INTO reviews (id, manifestation_id, user_id, week_start, what_worked, what_to_change)
VALUES (
  '52dab759-f694-4528-8fcd-12a664428aaa',
  '1aa20484-0212-4c45-91b9-a6566a14ff85',
  '3d279fbe-7e50-40c8-ad5b-049e996258d8',
  '2026-11-02',
  '把跑鞋放在門口，回家看到就會換。',
  '加班的日子改成下樓走 10 分鐘，不用跑。'
);
