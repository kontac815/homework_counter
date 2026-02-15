# 提出物ポイント管理 Webアプリ

Next.js + TypeScript + Tailwind + Prisma(PostgreSQL) + NextAuth で実装した、Chromebook運用向けの提出物ポイント管理アプリです。

## セットアップ

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

初期ログイン情報（seed時）:
- login_id: `admin`
- password: `password123`

## 主要画面

- `/login`: 先生ログイン
- `/scan`: スキャン登録（常時フォーカス、日付ベース、平日のみ登録、self_studyページ数入力、成功演出、直前取消）
- `/today`: 日次の未提出者一覧（任意日付、平日の未提出を赤表示）
- `/leaderboard`: 月間Top10 + 累積Top10
- `/tv`: TV表示モード（左:直近 / 中央:月間 / 右:累積、5秒自動更新、PIN付き終了）
- `/admin`: 教材pt設定、教材追加、QR一覧印刷(A4)、Excel出力
- `/admin/qr-print`: クラス×教材のQRコード一覧印刷（A4）

## QRフォーマット

`T4|BM|<YEAR>|<CLASS>|<NUM>|<MATERIAL>|<CRC>`

改行(`\r`/`\n`)を除去して処理します。CRCは不一致でも警告表示で受理します。

## データモデル

`prisma/schema.prisma` に以下を実装:
- users
- classes
- students
- materials
- booklets
- daily_assignments
- submissions
- user_classes（教師-クラス割当）

## Excel出力

`/api/export?classId=...&start=YYYY-MM-DD&end=YYYY-MM-DD`
- Sheet1: `submissions`
- Sheet2: `summary`

## タイムゾーン

学校運用日付境界は `Asia/Tokyo`（`APP_TIMEZONE`）を使用します。

## TV終了PIN

`TV_EXIT_PIN` を `.env` で設定してください（デフォルト: `2468`）。
