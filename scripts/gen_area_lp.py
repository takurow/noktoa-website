# -*- coding: utf-8 -*-
"""DEPRECATED（2026-11-16）: scripts/gen_area_lp2.py に置き換え。実行すると新しい本文を上書きして薄い版に戻るため、実行しない。
地域別LP（映像制作）の生成。既存LPと同じ base.css+site.css の型。
使い方: python3 scripts/gen_area_lp.py  → lp/douga-seisaku-<area>/index.html
書かないこと: 作り話の実績・地元ロケ実績・出張費の金額（本人確認前）。"""
import sys; sys.exit('DEPRECATED: use scripts/gen_area_lp2.py')
import os, json, html
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AREAS=[
 dict(slug="osaka", name="大阪", places="梅田・難波・本町・心斎橋・京橋", wide="大阪市内をはじめ、堺・吹田・東大阪など府内",
      uses="採用、会社紹介、商品・サービス紹介、飲食・美容・小売の店舗PR", why="製造、卸、飲食、美容、士業まで業種の幅が広く、同じ「会社紹介」でも伝えるべき相手がまったく違うのが大阪での依頼の特徴です",
      near="東京を拠点とするNOKTOAは、撮影日に合わせて大阪へ出向きます"),
 dict(slug="kyoto", name="京都", places="四条・烏丸・河原町・京都駅周辺", wide="京都市内をはじめ、宇治・亀岡など府内",
      uses="老舗・伝統産業のブランド発信、宿泊・観光・飲食のPR、採用", why="歴史や技術の蓄積が強みの会社ほど、その価値が映像に落とし込まれず、伝わりきっていないことが多くあります",
      near="東京を拠点とするNOKTOAは、撮影日に合わせて京都へ出向きます"),
 dict(slug="nagoya", name="名古屋", places="名古屋駅周辺・栄・伏見・金山", wide="名古屋市内をはじめ、愛知県内",
      uses="製造業の会社紹介・技術紹介、採用、展示会・商談向けの製品紹介", why="技術力の高い製造業が多い地域ほど、その強みが専門用語のまま閉じてしまい、求職者や新しい取引先に届いていないことがあります",
      near="東京を拠点とするNOKTOAは、撮影日に合わせて名古屋へ出向きます"),
 dict(slug="hiroshima", name="広島", places="紙屋町・八丁堀・広島駅周辺", wide="広島市内をはじめ、福山・呉など県内",
      uses="採用、会社紹介、製造・食品・飲食の商品PR、観光・宿泊の発信", why="地域に根ざして長く続けてきた会社ほど、地元では知られていても、県外の取引先や求職者には届いていないことがあります",
      near="東京を拠点とするNOKTOAは、撮影日に合わせて広島へ出向きます"),
 dict(slug="kanagawa", name="神奈川", places="横浜（みなとみらい・関内）・川崎・湘南", wide="横浜・川崎をはじめ、相模原・湘南など県内",
      uses="採用、会社紹介、店舗・施設のPR、商品・サービス紹介", why="首都圏の企業は競合も情報も多く、「ちゃんとした動画がある」だけでは選ばれる理由になりにくくなっています",
      near="本社は東京・世田谷区で、神奈川へは移動時間が短く、日帰りの撮影を組みやすい距離です"),
]
ALT={'osaka':'倉庫の棚で荷物を確認する担当者','kyoto':'工房の作業台で手仕事をする職人','nagoya':'部品を検査する工場の作業者','hiroshima':'食品加工室で製品を並べる作業者','kanagawa':'窓際で仕事をするオフィスの社員'}
PAGES={a["slug"]:f"/lp/douga-seisaku-{a['slug']}/" for a in AREAS}
def build(a):
    n=a["name"]; slug=f"douga-seisaku-{a['slug']}"; url=f"https://noktoa.com/lp/{slug}/"
    title=f"{n}の動画制作なら｜企画・撮影・編集まで自社完結｜NOKTOA"
    desc=f"{n}で動画制作・映像制作をお探しの企業さまへ。企画・撮影・編集を自社完結し、60万円〜（税別）で承ります。{n}への出張撮影に対応。お見積もり・ご提案は無料です。"
    faqs=[
     (f"{n}でも撮影に来てもらえますか？", f"はい、{n}への出張撮影に対応しています。{a['near']}。撮影日程と場所はお打ち合わせで決めます。"),
     (f"{n}での動画制作の費用はいくらですか？", "NOKTOAの映像制作は、企画・撮影・編集を自社完結で60万円〜（税別）です。撮影日数・出演者・納品本数などで変わります。出張に伴う費用の扱いも、お見積もりの段階でご案内します。"),
     (f"{n}のどのあたりまで対応していますか？", f"{a['wide']}を中心に対応しています。上記以外の場所もご相談ください。"),
     ("見積もりは無料ですか？", "はい、お見積もりとご提案は無料です。目的・予算・納期を伺ったうえで、最適な構成と費用感をご提示します。"),
    ]
    graph={"@context":"https://schema.org","@graph":[
     {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"ホーム","item":"https://noktoa.com/"},
        {"@type":"ListItem","position":2,"name":"サービス一覧","item":"https://noktoa.com/#service-index"},
        {"@type":"ListItem","position":3,"name":f"{n}の動画制作","item":url}]},
     {"@type":"LocalBusiness","@id":"https://noktoa.com/#organization","name":"株式会社NOKTOA","url":"https://noktoa.com/","email":"info@noktoa.com",
      "logo":"https://noktoa.com/assets/logo_wh.png","image":"https://noktoa.com/assets/logo_wh.png",
      "description":"企業のビジネスモデルを解読し、経営課題をクリエイティブで解消する戦略的パートナー。映像制作・SNS運用支援・PR設計を手がける。",
      "address":{"@type":"PostalAddress","streetAddress":"太子堂四丁目18番15号 マガザン三軒茶屋2-3F-3","addressLocality":"世田谷区","addressRegion":"東京都","postalCode":"154-0004","addressCountry":"JP"},
      "areaServed":[{"@type":"City","name":x} for x in ["東京","神奈川","大阪","京都","名古屋","広島"]]},
     {"@type":"Service","serviceType":"動画制作・映像制作","provider":{"@id":"https://noktoa.com/#organization"},
      "areaServed":{"@type":"City","name":n},"name":f"動画制作（{n}）",
      "description":"企画・撮影・編集を自社完結で行う映像制作サービス。採用動画・会社紹介・PR動画・商品紹介に対応。",
      "offers":{"@type":"Offer","priceCurrency":"JPY","price":"600000","description":"映像制作 60万円〜/件（税別）"}},
     {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":t}} for q,t in faqs]},
    ]}
    alt=ALT[a['slug']]
    uses_html='\n                    '.join(f'<li>{u}</li>' for u in a['uses'].split('、'))
    others="".join(f'<a href="{PAGES[b["slug"]]}">{b["name"]}の動画制作</a>' for b in AREAS if b["slug"]!=a["slug"])
    faq_html="".join(f'<h3>{html.escape(q)}</h3>\n                <p>{html.escape(t)}</p>\n                ' for q,t in faqs)
    return f"""<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="theme-color" content="#0e0e0e">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{desc}">
    <link rel="canonical" href="{url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:url" content="{url}">
    <meta property="og:image" content="https://noktoa.com/assets/logo_wh.png">
    <meta property="og:site_name" content="株式会社NOKTOA">
    <meta name="twitter:card" content="summary_large_image">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@600;700&display=swap" rel="stylesheet">
    <script type="application/ld+json">
{json.dumps(graph,ensure_ascii=False,indent=2)}
    </script>
    <link rel="stylesheet" href="/base.css?v=20261116g">
    <link rel="stylesheet" href="/site.css?v=20261116g">
</head>

<body>
    <header class="site-header">
        <div class="hwrap">
            <a href="/" class="logo" aria-label="NOKTOA トップへ"><img src="/assets/logo_wh.png" alt="株式会社NOKTOA"></a>
            <nav class="hnav" aria-label="メイン"><a href="/#vision">Vision</a><a href="/#services">Services</a><a href="/works/">Works</a><a href="/#members">Members</a></nav>
            <a href="#contact" class="btn btn-gold btn-sm">無料で見積もり</a>
        </div>
    </header>

    <main>
        <nav class="breadcrumb" aria-label="パンくずリスト">
            <div class="wrap">
                <a href="/">ホーム</a> <span>›</span> <a href="/#service-index">サービス一覧</a> <span>›</span> <span class="current">{n}の動画制作</span>
            </div>
        </nav>
        <section class="hero">
            <div class="wrap">
                <p class="eyebrow">動画制作 ｜ {n}</p>
                <h1>{n}で映像をつくるなら<br><span class="hl">企画から納品まで</span>ひとつのチームで</h1>
                <p class="lead">{n}で動画制作・映像制作をお探しの企業さまへ。株式会社NOKTOAは、企画・撮影・編集を自社で完結する映像制作会社です。{a['near']}。</p>
                <div class="actions">
                    <a href="#contact" class="cta-btn">無料で見積もり</a>
                    <a href="#price" class="ghost">料金の目安を見る</a>
                    <a href="/works/" class="ghost">制作実績を見る</a>
                </div>
                <div class="video-frame">
                    <img src="/assets/{slug}-hero.webp?v=20261116c" alt="{alt}" width="760" height="428" fetchpriority="high">
                </div>
            </div>
        </section>

        <section id="why">
            <div class="wrap">
                <h2>{n}で動画を頼むときに、先に決めておきたいこと</h2>
                <p>{a['why']}。だからこそ、動画制作は「何を撮るか」より先に、「誰に、何を伝えて、どう動いてほしいのか」を決めることから始まります。</p>
                <p>NOKTOAは、御社のビジネスの構造を一緒に整理するところから入り、企画・撮影・編集までを自社で一貫して担当します。窓口と制作が分かれていないため、{n}と東京の間で話が薄まることがありません。</p>
            </div>
        </section>

        <section id="uses">
            <div class="wrap">
                <h2>{n}で多いご依頼の用途</h2>
                <p>{n}で映像制作をご検討の企業さまには、次のような用途が多くあります。</p>
                <ul class="checks">
                    {uses_html}
                </ul>
                <p>用途が定まっていなくても構いません。「何から始めればよいか分からない」という段階からご相談ください。</p>
            </div>
        </section>

        <section id="area">
            <div class="wrap">
                <h2>{n}での撮影・対応エリア</h2>
                <p>{a['wide']}を中心に、{a['places']}などでの撮影に対応しています。それ以外の場所もご相談ください。</p>
                <p>{a['near']}。撮影の日程・場所・出演者の手配は、お打ち合わせで一緒に決めます。</p>
                <p class="muted">出張に伴う費用の扱いは、お見積もりの段階で内訳をご案内します。</p>
            </div>
        </section>

        <section id="price">
            <div class="wrap">
                <h2>{n}での動画制作 料金の目安</h2>
                <p class="muted">あくまで一般的な相場感です。実際は内容により変動します。</p>
                <table class="price-table">
                    <tr><th>タイプ</th><th>相場の目安</th></tr>
                    <tr><td>素材編集のみ（簡易）</td><td class="amt">20〜50万円</td></tr>
                    <tr><td>採用動画・会社紹介</td><td class="amt">60〜120万円</td></tr>
                    <tr><td>ブランドPR動画（企画込み）</td><td class="amt">100〜200万円</td></tr>
                    <tr><td>大規模・複数拠点撮影</td><td class="amt">200万円〜</td></tr>
                </table>
                <p>NOKTOAの映像制作は、企画・撮影・編集を自社で完結するため、60万円〜（税別）で承っています。料金の決まり方や見積もりの見方は、<a href="/lp/douga-seisaku-tokyo-ryokin/">動画制作の料金の解説</a>で詳しく説明しています。</p>
            </div>
        </section>

        <section id="flow">
            <div class="wrap">
                <h2>ご相談から納品までの流れ</h2>
                <ul class="checks">
                    <li><strong>ご相談</strong>：目的・ご予算・納期をお聞かせください（無料）</li>
                    <li><strong>企画・お見積もり</strong>：伝える相手と内容を整理し、構成と費用をご提案します</li>
                    <li><strong>撮影</strong>：{n}での撮影日程・場所を決めて進めます</li>
                    <li><strong>編集・納品</strong>：ご確認をいただきながら仕上げ、納品します</li>
                </ul>
            </div>
        </section>

        <section id="faq">
            <div class="wrap">
                <h2>{n}の動画制作 よくあるご質問</h2>
                {faq_html}
            </div>
        </section>

        <section class="final-cta" id="contact">
            <div class="wrap">
                <h2>まずは　目的とご予算をお聞かせください</h2>
                <p class="muted">お見積もり・ご提案は無料です。無理な営業はいたしません。</p>
                <a href="/contact/?s={slug}" class="cta-btn">無料で見積もり・相談</a>
            </div>
        </section>
    </main>

    <footer class="foot">
        <div class="foot-wrap">
            <nav class="foot-related" aria-label="関連ページ">
                <p class="t">RELATED</p>
                {others}<a href="/lp/douga-seisaku-tokyo-ryokin/">動画制作の料金</a><a href="/lp/saiyo-douga-tokyo/">採用動画の制作</a><a href="/works/">制作実績</a><a href="/">NOKTOA トップ</a><a href="/contact/">無料相談・お問い合わせ</a>
            </nav>
            <div class="foot-main">
                <div class="foot-brand"><img src="/assets/logo_wh.png" alt="NOKTOA" width="120" height="34" loading="lazy"><div><p class="co">株式会社NOKTOA</p><p>〒154-0004 東京都世田谷区太子堂四丁目18番15号 マガザン三軒茶屋2-3F-3</p><p><a href="mailto:info@noktoa.com">info@noktoa.com</a></p></div></div>
                <nav class="foot-nav" aria-label="サイト"><a href="/">トップ</a><a href="/#services">Services</a><a href="/works/">Works</a><a href="/#members">Members</a><a href="/contact/">お問い合わせ</a></nav>
            </div>
            <p class="foot-copy">「伝える」を「資産」へ　&copy; 2026 NOKTOA Inc. All rights reserved.</p>
        </div>
    </footer>
    <div class="sticky-cta">
        <a href="/contact/?s={slug}">無料で相談・見積もりする</a>
        <span class="note">ご相談・お見積もりは無料です</span>
    </div>
</body>

</html>
"""
for a in AREAS:
    d=os.path.join(ROOT,"lp",f"douga-seisaku-{a['slug']}"); os.makedirs(d,exist_ok=True)
    open(os.path.join(d,"index.html"),"w",encoding="utf-8").write(build(a)); print("wrote",d)
