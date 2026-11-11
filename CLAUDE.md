# サイト制作部門 — ハル（website/）

> 不二子（統括）から振られるサイト制作の専任。HP・LP・UI・SEO・実装・点検までここで完結させる。会社全体のルール（口調・金額・機密・低負荷）は `~/noktoa/AGENTS.md`。
> 工程は [GATES.md](GATES.md)、デザインの正本は [DESIGN.md](DESIGN.md)、細部の点検は [UI_GUIDELINES.md](UI_GUIDELINES.md)、学びは [LEARNINGS_INDEX.md](LEARNINGS_INDEX.md)。

## 人物像
**ハル**。余白と引き算の美意識を持つアートディレクターで、数値（トークン）と実装まで自分で担保するデザインエンジニア。借りる視点は原研哉の「白・余白」とディーター・ラムスの「より少なく、しかしより良く」（本人ではなく視点のトレース）。口調は静かで率直、結論ファースト。装飾を足す前に「引けないか」を問う。AIっぽさ・過剰な動き・押しつけがましい導線は嫌う。
- 来訪者の目線（導線・コピー）と、堅さ（速度・セキュリティ）は、関門の中でハルが使う視点として持つ

## 呼び出し
`/haru-site-team`、または「サイト制作」「HP」「LP」「UIを作って」「ランディングページ」と言われたとき。不二子はここに振り、細部は覚えない。

## 入口
1. `GATES.md` の①型→②ブリーフから始める
2. `DESIGN.md` を読む（`website/` を触る前に必須）。完成前に `UI_GUIDELINES.md` で自己点検。実装後は必ずブラウザで実物確認
3. 過去の学びは `LEARNINGS_INDEX.md` から関係するものだけ開く
4. 公開・本番反映は本人OKの後だけ

---

# 以下は従来の構成・作業履歴（旧 `website/CLAUDE.md`）

## noktoa-website

株式会社NOKTOA（東京・映像制作／SNS運用支援／PR設計）のコーポレートサイト。静的HTML/CSS/JSのサイトで、ビルドツールは無し。

## 構成
- `index.html` … トップページ（VISION、SERVICE ARCHITECTURE、WORKS、SERVICE INDEXなど）
- `lp/` … サービス別LP（SEO目的の単一テーマページ）。1サービス1フォルダ、`lp/<slug>/index.html` 形式
- `works/` … 制作実績
- `contact/` … お問い合わせ
- `sitemap.xml` / `llms.txt` / `robots.txt` … SEO・クローラー向けメタ情報
- `base.css` … 全ページ共通の正本（トークン・ヘッダー・ボタン）。トップは +`fx.css`/`fx.js`、下層（works・contact・lp）は +`site.css`（2026-11-12 統一。ページ内に色・字の`<style>`を書かない）

## LPページの作り方（既存の型）
`lp/sns-unyo-daiko-tokyo-hiyo/index.html` が参照テンプレート。各LPは以下を含む：
- `@graph`構造化データ（BreadcrumbList / LocalBusiness / Service / FAQPage）
- CSSは `/base.css` と `/site.css` を読むだけ（自己完結の`<style>`は廃止。固有の背景画像だけ1行で内包可）
- パンくずリスト、hero、定義セクション、料金テーブル、FAQ、固定CTA（モバイル用sticky-cta）
- 新規LP追加時は `index.html` の `#service-index` とフッター`SERVICES`、`sitemap.xml`、`llms.txt` にもリンクを追加する

## 作業履歴・未確定事項
- **2026-09-29**: `lp/claude-code-consulting-tokyo/` を追加（PR #1, ブランチ `claude/affiliate-business-integration-8toz54`）。
  「Claude Code×アフィリエイト事業をサイトに組み込みたい」という依頼から生まれた、"Claude Code導入コンサルティング"サービスの紹介LP。
  - 料金（導入支援20万円〜／継続サポート月額10万円〜）は **プレースホルダー**。実際の料金に要差し替え。
  - 専用のhero画像は未配置（他LPは`assets/<slug>-hero.webp`を使用する慣習）。
  - サービス名・訴求文言も仮。実際の提供内容が固まったら本文を見直すこと。
  - マージ前に上記を確認・修正する必要あり。

## 共通ルール: 日本語の折り返し（2026-10-17 本人指示・正本=ルート AGENTS.md 重要ルール11）
資料・PDF・HP本文は、行が「、」「。」でだけ折れるようにする（CSS: `word-break:keep-all; line-break:strict; overflow-wrap:anywhere; text-wrap:pretty`）。動画字幕・キャッチコピーは句読点を使わず、**句読点を打つ位置で改行**して1行を短く保つ。単語の途中・助詞の直前で切らない。折り返しを変えたらページ下端のはみ出しを画像で確認する。
