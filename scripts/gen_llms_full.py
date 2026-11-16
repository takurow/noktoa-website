#!/usr/bin/env python3
"""公開ページ本文から llms-full.txt を生成（AI検索・RAG向けの全文テキスト）。
使い方: python3 scripts/gen_llms_full.py   （website/ 直下で実行・noindexページは除外）"""
import re, html, glob, datetime, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
pages = ['index.html'] + sorted(glob.glob('lp/*/index.html')) + ['works/index.html', 'contact/index.html']
def clean(h):
    h = re.sub(r'<(script|style|svg|noscript|template)[\s\S]*?</\1>', '', h)
    h = re.sub(r'<(header|footer|nav)[\s\S]*?</\1>', '', h)
    h = re.sub(r'</(p|li|h[1-6]|div|section|tr|dt|dd|summary)>', '\n', h)
    h = re.sub(r'(<h[1-6][^>]*>)([\s\S]*?)(</h[1-6]>)', lambda m: m.group(1) + re.sub(r'<br\s*/?>', '', m.group(2)) + m.group(3), h)
    h = re.sub(r'<br\s*/?>', '\n', h)
    h = re.sub(r'<h([1-6])[^>]*>', lambda m: '\n' + '#' * int(m.group(1)) + ' ', h)
    h = re.sub(r'<[^>]+>', '', h)
    h = html.unescape(h)
    lines = [re.sub(r'[ \t　]+', ' ', l).strip() for l in h.split('\n')]
    out, prev = [], ''
    for l in lines:
        if l and l != prev: out.append(l)
        prev = l
    return '\n'.join(out)
def meta(h, pat):
    m = re.search(pat, h); return html.unescape(m.group(1)).strip() if m else ''
out = ['# 株式会社NOKTOA 公式サイト全文（AI検索・生成AI向け）', '',
       f'> 生成日: {datetime.date.today()} / 正本: https://noktoa.com/ ／ 料金・条件は各ページの記載が正。ここは本文の写し。', '']
for p in pages:
    h = open(p, encoding='utf-8').read()
    url = 'https://noktoa.com/' + p.replace('index.html', '')
    title = meta(h, r'<title>([\s\S]*?)</title>'); desc = meta(h, r'name="description"\s+content="([^"]*)"')
    body = re.search(r'<main[\s\S]*?</main>', h) or re.search(r'<body[\s\S]*</body>', h)
    out += ['', '---', f'## {title}', f'URL: {url}', f'要約: {desc}', '', clean(body.group(0))]
open('llms-full.txt', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('pages', len(pages), 'bytes', os.path.getsize('llms-full.txt'))
