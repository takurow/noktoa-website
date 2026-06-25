# -*- coding: utf-8 -*-
import os, re, json

STYLE = """
        :root { --bg: #0a0a0f; --surface: #14141c; --line: rgba(255, 255, 255, 0.1); --text: #f2f2f5; --muted: #a0a0aa; --accent: #c9a86a; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Noto Sans JP", "Inter", sans-serif; background: var(--bg); color: var(--text); line-height: 1.9; font-weight: 300; -webkit-font-smoothing: antialiased; }
        a { color: inherit; }
        .wrap { max-width: 760px; margin: 0 auto; padding: 0 24px; }
        header { border-bottom: 1px solid var(--line); padding: 18px 0; position: sticky; top: 0; background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(10px); z-index: 10; }
        header .wrap { display: flex; align-items: center; justify-content: space-between; }
        header img { height: 26px; }
        .cta-btn { display: inline-block; background: var(--accent); color: #14141c; padding: 10px 22px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 14px; }
        .hero { padding: 72px 0 56px; }
        .hero .eyebrow { color: var(--accent); letter-spacing: 0.12em; font-size: 13px; font-weight: 500; margin-bottom: 20px; }
        .hero h1 { font-size: clamp(28px, 6vw, 44px); font-weight: 700; line-height: 1.4; letter-spacing: 0.01em; margin-bottom: 24px; }
        .hero h1 .hl { color: var(--accent); }
        .hero .lead { color: var(--muted); font-size: 17px; margin-bottom: 36px; }
        .hero .actions { display: flex; gap: 14px; flex-wrap: wrap; }
        .hero .actions .ghost { border: 1px solid var(--line); padding: 10px 22px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; }
        .video-frame { margin: 8px 0 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); aspect-ratio: 16 / 9; background: var(--surface); }
        .video-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .definition { background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 20px 24px; margin: 8px 0 0; }
        .definition p { margin: 0; color: #d8d8de; }
        section { padding: 48px 0; border-top: 1px solid var(--line); }
        h2 { font-size: clamp(22px, 4.5vw, 30px); font-weight: 700; margin-bottom: 24px; line-height: 1.5; }
        h3 { font-size: 19px; font-weight: 500; margin: 32px 0 12px; color: var(--text); }
        p { margin-bottom: 18px; color: #d8d8de; }
        .muted { color: var(--muted); }
        .lead-conclusion { color: var(--accent); font-weight: 500; }
        ul.checks { list-style: none; margin: 18px 0; }
        ul.checks li { padding: 10px 0 10px 28px; position: relative; border-bottom: 1px solid var(--line); color: #d8d8de; }
        ul.checks li::before { content: "—"; position: absolute; left: 0; color: var(--accent); }
        .faq-item { border-bottom: 1px solid var(--line); padding: 18px 0; }
        .faq-item .q { font-weight: 500; margin-bottom: 8px; }
        .faq-item .q::before { content: "Q. "; color: var(--accent); }
        .faq-item .a { color: var(--muted); font-size: 15px; margin: 0; }
        .final-cta { text-align: center; padding: 64px 0; }
        .final-cta h2 { margin-bottom: 16px; }
        .final-cta p { margin-bottom: 28px; }
        .related { font-size: 14px; }
        .related a { color: var(--accent); text-decoration: none; margin-right: 20px; }
        footer { border-top: 1px solid var(--line); padding: 32px 0; font-size: 13px; color: var(--muted); }
        footer a { color: var(--muted); }
"""

PRICE_TIERS = """                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin:24px 0;">
                    <div style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:22px;">
                        <p style="color:var(--accent); font-weight:500; margin:0 0 8px;">スモールスタート</p>
                        <p style="font-size:14px; color:var(--muted); margin:0;">{t1}</p>
                    </div>
                    <div style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:22px;">
                        <p style="color:var(--accent); font-weight:500; margin:0 0 8px;">スタンダード</p>
                        <p style="font-size:14px; color:var(--muted); margin:0;">{t2}</p>
                    </div>
                    <div style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:22px;">
                        <p style="color:var(--accent); font-weight:500; margin:0 0 8px;">フラッグシップ</p>
                        <p style="font-size:14px; color:var(--muted); margin:0;">{t3}</p>
                    </div>
                </div>
"""

def section(html_inner):
    return '        <section>\n            <div class="wrap">\n' + html_inner + '\n            </div>\n        </section>\n'

def render(p):
    faq_ld = [{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in p["faq"]]
    graph = [
        {"@type":"LocalBusiness","@id":"https://noktoa.com/#organization","name":"株式会社NOKTOA","url":"https://noktoa.com/","email":"info@noktoa.com","logo":"https://noktoa.com/assets/logo_wh.png","image":"https://noktoa.com/assets/logo_wh.png","description":"企業のビジネスモデルを解読し、経営課題をクリエイティブで解消する戦略的パートナー。"+p["org_desc"],"address":{"@type":"PostalAddress","streetAddress":"太子堂四丁目18番15号 マガザン三軒茶屋2-3F-3","addressLocality":"世田谷区","addressRegion":"東京都","postalCode":"154-0004","addressCountry":"JP"},"areaServed":{"@type":"City","name":"東京"}},
        {"@type":"Service","serviceType":p["service_type"],"provider":{"@id":"https://noktoa.com/#organization"},"areaServed":{"@type":"City","name":"東京"},"name":p["service_name"],"description":p["service_desc"]},
        {"@type":"FAQPage","mainEntity":faq_ld},
    ]
    if p.get("offer"):
        graph[1]["offers"]={"@type":"Offer","priceCurrency":"JPY","price":p["offer"][0],"description":p["offer"][1]}
    ld = json.dumps({"@context":"https://schema.org","@graph":graph}, ensure_ascii=False, indent=2)

    faq_html = "".join(
        f'                <div class="faq-item">\n                    <p class="q">{q}</p>\n                    <p class="a">{a}</p>\n                </div>\n'
        for q,a in p["faq"])

    related = "".join(f'                <a href="{u}">{t}</a>\n' for t,u in p["related"])

    body_sections = ""
    # definition section
    body_sections += '        <section id="what">\n            <div class="wrap">\n'
    body_sections += f'                <h2>{p["def_h2"]}</h2>\n'
    body_sections += f'                <div class="definition"><p><strong>{p["definition"]}</strong>{p["def_tail"]}</p></div>\n'
    for para in p["def_paras"]:
        body_sections += f'                <p>{para}</p>\n'
    body_sections += '            </div>\n        </section>\n'
    # content sections
    for s in p["sections"]:
        body_sections += '        <section>\n            <div class="wrap">\n'
        body_sections += f'                <h2>{s["h2"]}</h2>\n'
        if s.get("conclusion"):
            body_sections += f'                <p class="lead-conclusion">結論：{s["conclusion"]}</p>\n'
        for blk in s["blocks"]:
            if blk[0]=="p":
                body_sections += f'                <p>{blk[1]}</p>\n'
            elif blk[0]=="h3":
                body_sections += f'                <h3>{blk[1]}</h3>\n'
            elif blk[0]=="ul":
                body_sections += '                <ul class="checks">\n'
                for li in blk[1]:
                    body_sections += f'                    <li>{li}</li>\n'
                body_sections += '                </ul>\n'
        body_sections += '            </div>\n        </section>\n'
    # price section
    body_sections += '        <section id="price">\n            <div class="wrap">\n'
    body_sections += f'                <h2>{p["price_h2"]}</h2>\n'
    body_sections += f'                <p>{p["price_intro"]}</p>\n'
    body_sections += PRICE_TIERS.format(t1=p["tiers"][0], t2=p["tiers"][1], t3=p["tiers"][2])
    body_sections += f'                <p class="muted">{p["price_outro"]}</p>\n'
    body_sections += '            </div>\n        </section>\n'

    html = f"""<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{p["title"]}</title>
    <meta name="description" content="{p["desc"]}">
    <link rel="canonical" href="https://noktoa.com/lp/{p["slug"]}/">

    <meta property="og:type" content="website">
    <meta property="og:title" content="{p["title"]}">
    <meta property="og:description" content="{p["og_desc"]}">
    <meta property="og:url" content="https://noktoa.com/lp/{p["slug"]}/">
    <meta property="og:image" content="https://noktoa.com/assets/logo_wh.png">
    <meta property="og:site_name" content="株式会社NOKTOA">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Noto+Sans+JP:wght@300;400;500;700;900&display=swap" rel="stylesheet">

    <script type="application/ld+json">
{ld}
    </script>

    <style>{STYLE}    </style>
</head>

<body>
    <header>
        <div class="wrap">
            <a href="/"><img src="../../assets/logo_wh.png" alt="株式会社NOKTOA"></a>
            <a href="#contact" class="cta-btn">無料で相談する</a>
        </div>
    </header>

    <main>
        <section class="hero">
            <div class="wrap">
                <p class="eyebrow">{p["eyebrow"]}</p>
                <h1>{p["h1"]}</h1>
                <p class="lead">{p["lead"]}</p>
                <div class="actions">
                    <a href="#contact" class="cta-btn">無料で相談する</a>
                    <a href="#what" class="ghost">{p["ghost"]}</a>
                </div>
                <div class="video-frame">
                    <img src="../../assets/{p["slug"]}-hero.webp" alt="{p["img_alt"]}" width="760" height="428" fetchpriority="high">
                </div>
            </div>
        </section>

{body_sections}
        <section id="faq">
            <div class="wrap">
                <h2>よくあるご質問</h2>
{faq_html}            </div>
        </section>

        <section class="final-cta" id="contact">
            <div class="wrap">
                <h2>{p["cta_h2"]}</h2>
                <p class="muted">{p["cta_p"]}</p>
                <a href="mailto:info@noktoa.com?subject={p["cta_subject"]}" class="cta-btn">無料で相談する</a>
            </div>
        </section>
    </main>

    <footer>
        <div class="wrap">
            <p class="related">
                関連ページ：
{related}                <a href="/">NOKTOA トップ</a>
            </p>
            <p style="margin-top:16px;">株式会社NOKTOA ｜ 〒154-0004 東京都世田谷区太子堂四丁目18番15号 マガザン三軒茶屋2-3F-3 ｜ <a href="mailto:info@noktoa.com">info@noktoa.com</a></p>
            <p style="margin-top:8px;">© 2026 NOKTOA Inc.</p>
        </div>
    </footer>
</body>

</html>
"""
    return html

def body_chars(html):
    body = html.split("<body>")[1].split("</body>")[0]
    body = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", body, flags=re.S)
    text = re.sub(r"<[^>]+>", "", body)
    return len(re.sub(r"\s+", "", text))

if __name__ == "__main__":
    from lp_data import PAGES
    base = os.path.expanduser("~/noktoa/website/lp")
    for p in PAGES:
        html = render(p)
        d = os.path.join(base, p["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        n = body_chars(html)
        print(f'{p["slug"]}: {n} 字 {"OK" if n>=3000 else "SHORT"}')
