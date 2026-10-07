# noktoa-website

株式会社NOKTOA（東京・映像制作／SNS運用支援／PR設計）のコーポレートサイト。静的HTML/CSS/JSのサイトで、ビルドツールは無し。

## 構成
- `index.html` … トップページ（VISION、SERVICE ARCHITECTURE、WORKS、SERVICE INDEXなど）
- `lp/` … サービス別LP（SEO目的の単一テーマページ）。1サービス1フォルダ、`lp/<slug>/index.html` 形式
- `works/` … 制作実績
- `contact/` … お問い合わせ
- `sitemap.xml` / `llms.txt` / `robots.txt` … SEO・クローラー向けメタ情報
- `styles.css` / `script.js` … トップページ用。`lp/`配下は各ページに`<style>`を内包した自己完結型

## LPページの作り方（既存の型）
`lp/sns-unyo-daiko-tokyo-hiyo/index.html` が参照テンプレート。各LPは以下を含む：
- `@graph`構造化データ（BreadcrumbList / LocalBusiness / Service / FAQPage）
- ダークテーマの自己完結CSS（`--bg`, `--accent: #c9a86a` 等の変数）
- パンくずリスト、hero、定義セクション、料金テーブル、FAQ、固定CTA（モバイル用sticky-cta）
- 新規LP追加時は `index.html` の `#service-index` とフッター`SERVICES`、`sitemap.xml`、`llms.txt` にもリンクを追加する

## 作業履歴・未確定事項
- **2026-09-29**: `lp/claude-code-consulting-tokyo/` を追加（PR #1, ブランチ `claude/affiliate-business-integration-8toz54`）。
  「Claude Code×アフィリエイト事業をサイトに組み込みたい」という依頼から生まれた、"Claude Code導入コンサルティング"サービスの紹介LP。
  - 料金（導入支援20万円〜／継続サポート月額10万円〜）は **プレースホルダー**。実際の料金に要差し替え。
  - 専用のhero画像は未配置（他LPは`assets/<slug>-hero.webp`を使用する慣習）。
  - サービス名・訴求文言も仮。実際の提供内容が固まったら本文を見直すこと。
  - マージ前に上記を確認・修正する必要あり。
