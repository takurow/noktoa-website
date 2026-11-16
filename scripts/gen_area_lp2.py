# -*- coding: utf-8 -*-
"""地方版LP生成（2026-11-16）。scripts/area_content/<slug>.json → lp/<slug>/index.html
本文はJSONが正本。HTMLの骨格は既存LP（base.css+site.css）と同じ。
使い方: python3 scripts/gen_area_lp2.py   （gen_area_lp.py は廃止＝この版が置き換え）"""
import os, re, json, html, glob
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSSV='20261116g'; IMGV='20261116c'
AREAS=["東京","神奈川","大阪","京都","名古屋","広島"]
ALT={
 'douga-seisaku-osaka':'倉庫の棚で荷物を確認する担当者','douga-seisaku-kyoto':'工房の作業台で手仕事をする職人','douga-seisaku-nagoya':'部品を検査する工場の作業者',
 'douga-seisaku-hiroshima':'食品加工室で製品を並べる作業者','douga-seisaku-kanagawa':'窓際で仕事をするオフィスの社員',
 'saiyo-douga-kanagawa':'面接の前にメモを読み返す若手社員','saiyo-douga-osaka':'ショールームの棚で商品を確認する社員','saiyo-douga-hiroshima':'休憩室でノートを見ながら考える作業者',
 'sns-unyo-daiko-kanagawa':'ショップで商品を整える店員','sns-unyo-daiko-osaka':'厨房で料理を盛りつける料理人','sns-unyo-daiko-hiroshima':'スマートフォンで商品を撮影する店員'}
SERV={
 'douga':dict(type='動画制作・映像制作',name='動画制作（{a}）',desc='企画・撮影・編集を自社完結で行う映像制作サービス。採用動画・会社紹介・PR動画・商品紹介に対応。',price='600000',pdesc='映像制作 60万円〜/件（税別）',jp='動画制作',tokyo='/lp/douga-seisaku-tokyo-ryokin/',tokyo_t='動画制作の料金'),
 'saiyo':dict(type='採用動画制作',name='採用動画制作（{a}）',desc='企画・撮影・編集を自社完結で行う採用動画の制作サービス。',price='600000',pdesc='映像制作 60万円〜/件（税別）',jp='採用動画',tokyo='/lp/saiyo-douga-tokyo/',tokyo_t='採用動画の制作（東京）'),
 'sns':dict(type='SNS運用支援',name='SNS運用代行（{a}）',desc='企画・撮影・投稿管理・分析・月次レポートまで一貫対応するSNS運用支援。',price='300000',pdesc='SNS運用支援 月額30万円〜（税別）',jp='SNS運用代行',tokyo='/lp/sns-unyo-daiko-tokyo-hiyo/',tokyo_t='SNS運用代行の費用（東京）'),
}
def esc(x): return html.escape(x,quote=False)
def plain(x): return re.sub(r'<[^>]+>','',x)
def split_p(text):
    """長い段落を文の切れ目で2〜3文ずつに分ける（本文は変えない）"""
    if len(text)<100: return [text]
    sents=[]; buf=''; depth=0
    for ch in text:
        buf+=ch
        if ch in '「『（(': depth+=1
        elif ch in '」』）)': depth=max(0,depth-1)
        elif ch=='。' and depth==0: sents.append(buf); buf=''
    if buf.strip(): sents.append(buf)
    if len(sents)<3: return [text]
    chunks=[]; cur=''
    for s in sents:
        cur+=s
        if len(cur)>=58: chunks.append(cur); cur=''
    if cur:
        if chunks and len(cur)<28: chunks[-1]+=cur
        else: chunks.append(cur)
    return chunks
def li(x):
    if '：' in x:
        a,b=x.split('：',1); return f'<li><strong>{esc(a)}</strong>：{esc(b)}</li>'
    return f'<li>{esc(x)}</li>'
def render_blocks(blocks):
    out=[]
    for b in blocks:
        t,x=b['t'],b['x']
        if t=='p': out+= [f'<p>{esc(c)}</p>' for c in split_p(x)]
        elif t=='h3': out.append(f'<h3>{esc(x)}</h3>')
        elif t=='note': out.append(f'<p class="muted">{esc(x)}</p>')
        elif t=='ul': out.append('<ul class="checks">\n'+'\n'.join('    '+li(i) for i in x)+'\n</ul>')
        elif t=='table':
            rows=x; hd=''.join(f'<th>{esc(c)}</th>' for c in rows[0])
            body=''.join('<tr>'+''.join((f'<td class="amt">{esc(c)}</td>' if j==len(r)-1 and len(r)>1 else f'<td>{esc(c)}</td>') for j,c in enumerate(r))+'</tr>' for r in rows[1:])
            out.append(f'<table class="price-table">\n<tr>{hd}</tr>\n{body}\n</table>')
    return out
def body_text(d):
    t=[d['lead']]
    for s in d['sections']:
        t.append(s['h2'])
        for b in s['blocks']:
            x=b['x']; t+= (x if b['t']=='ul' else [c for r in x for c in r] if b['t']=='table' else [x])
    for f in d['faq']: t+=[f['q'],f['a']]
    return ''.join(t)
def build(d):
    sv=SERV[d['service']]; a=d['area']; slug=d['slug']; url=f'https://noktoa.com/lp/{slug}/'
    title=d['title']; desc=d['description']; ind=' '*8
    graph={"@context":"https://schema.org","@graph":[
     {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"ホーム","item":"https://noktoa.com/"},
        {"@type":"ListItem","position":2,"name":"サービス一覧","item":"https://noktoa.com/#service-index"},
        {"@type":"ListItem","position":3,"name":d['crumb'],"item":url}]},
     {"@type":"LocalBusiness","@id":"https://noktoa.com/#organization","name":"株式会社NOKTOA","url":"https://noktoa.com/","email":"info@noktoa.com",
      "logo":"https://noktoa.com/assets/logo_wh.png","image":"https://noktoa.com/assets/logo_wh.png",
      "description":"企業のビジネスモデルを解読し、経営課題をクリエイティブで解消する戦略的パートナー。映像制作・SNS運用支援・PR設計を手がける。",
      "address":{"@type":"PostalAddress","streetAddress":"太子堂四丁目18番15号 マガザン三軒茶屋2-3F-3","addressLocality":"世田谷区","addressRegion":"東京都","postalCode":"154-0004","addressCountry":"JP"},
      "areaServed":[{"@type":"City","name":x} for x in AREAS]},
     {"@type":"Service","serviceType":sv['type'],"provider":{"@id":"https://noktoa.com/#organization"},"areaServed":{"@type":"City","name":a},
      "name":sv['name'].format(a=a),"description":sv['desc'],
      "offers":{"@type":"Offer","priceCurrency":"JPY","price":sv['price'],"description":sv['pdesc']}},
     {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":f['q'],"acceptedAnswer":{"@type":"Answer","text":f['a']}} for f in d['faq']]},
    ]}
    secs=[]
    for s in d['sections']:
        inner='\n'.join(ind+'        '+l for l in render_blocks(s['blocks']))
        secs.append(f'''        <section id="{s['id']}">
            <div class="wrap">
                <h2>{esc(s['h2'])}</h2>
{inner}
            </div>
        </section>
''')
    faq=''.join(f'''                <div class="faq-item">
                    <p class="q">{esc(f['q'])}</p>
                    <p class="a">{esc(f['a'])}</p>
                </div>
''' for f in d['faq'])
    mine=[json.load(open(p,encoding='utf-8')) for p in sorted(glob.glob(os.path.join(ROOT,'scripts/area_content/*.json')))]
    rel=[x for x in mine if x['slug']!=slug and (x['service']==d['service'] or x['area']==a)]
    rel_html=''.join(f'<a href="/lp/{x["slug"]}/">{esc(x["crumb"])}</a>' for x in rel[:6])
    h1=d['h1']
    return f'''<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="theme-color" content="#0e0e0e">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(title)}</title>
    <meta name="description" content="{html.escape(desc)}">
    <link rel="canonical" href="{url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{html.escape(title)}">
    <meta property="og:description" content="{html.escape(desc)}">
    <meta property="og:url" content="{url}">
    <meta property="og:image" content="https://noktoa.com/assets/logo_wh.png">
    <meta property="og:site_name" content="株式会社NOKTOA">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@600;700&display=swap" rel="stylesheet">
    <script type="application/ld+json">
{json.dumps(graph,ensure_ascii=False,indent=2)}
    </script>
    <link rel="stylesheet" href="/base.css?v={CSSV}">
    <link rel="stylesheet" href="/site.css?v={CSSV}">
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
                <a href="/">ホーム</a> <span>›</span> <a href="/#service-index">サービス一覧</a> <span>›</span> <span class="current">{esc(d['crumb'])}</span>
            </div>
        </nav>
        <section class="hero">
            <div class="wrap">
                <p class="eyebrow">{esc(d['eyebrow'])}</p>
                <h1>{esc(h1[0])}<br><span class="hl">{esc(h1[1])}</span>{esc(h1[2])}</h1>
                <p class="lead">{esc(d['lead'])}</p>
                <div class="actions">
                    <a href="#contact" class="cta-btn">無料で見積もり</a>
                    <a href="#{d['sections'][min(3,len(d['sections'])-1)]['id']}" class="ghost">詳しく見る</a>
                    <a href="/works/" class="ghost">制作実績を見る</a>
                </div>
                <div class="video-frame">
                    <img src="/assets/{slug}-hero.webp?v={IMGV}" alt="{ALT[slug]}" width="760" height="428" fetchpriority="high">
                </div>
            </div>
        </section>

{''.join(secs)}
        <section id="faq">
            <div class="wrap narrow">
                <p class="eyebrow-sm">よくあるご質問</p>
{faq}            </div>
        </section>

        <section class="final-cta" id="contact">
            <div class="wrap">
                <h2>{esc(d['cta_h2'])}</h2>
                <p class="muted">{esc(d['cta_note'])}</p>
                <a href="/contact/?s={slug}" class="cta-btn">無料で見積もり・相談</a>
            </div>
        </section>
    </main>

    <footer class="foot">
        <div class="foot-wrap">
            <nav class="foot-related" aria-label="関連ページ">
                <p class="t">RELATED</p>
                {rel_html}<a href="{sv['tokyo']}">{esc(sv['tokyo_t'])}</a><a href="/works/">制作実績</a><a href="/">NOKTOA トップ</a><a href="/contact/">無料相談・お問い合わせ</a>
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
'''
if __name__=='__main__':
    for p in sorted(glob.glob(os.path.join(ROOT,'scripts/area_content/*.json'))):
        d=json.load(open(p,encoding='utf-8')); n=len(re.sub(r'\s+','',body_text(d)))
        os.makedirs(os.path.join(ROOT,'lp',d['slug']),exist_ok=True)
        open(os.path.join(ROOT,'lp',d['slug'],'index.html'),'w',encoding='utf-8').write(build(d)); print(d['slug'],n,'字')
