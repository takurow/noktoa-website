# -*- coding: utf-8 -*-
"""地方版LPのJSON本文の検査（独立チェック）。使い方: python3 scripts/qc_area_content.py [dir]"""
import json,glob,re,sys,os,itertools
D=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'_mockup/area_content')
BAN=['実績','多数','数多く','豊富','必ず','確実','No.1','ナンバーワン','無料で出張','出張費無料','出張費は無料','○社','〇社','社以上','業界最','保証','絶対','圧倒的','日本一','地元密着','創業','累計','件以上','倍に','%向上','％向上','割引','キャンペーン']
OKNUM=re.compile(r'(\d[\d,.]*)\s*(万円|円|週間|週|か月|ヶ月|時間|年|日|名|本|分|%|％)')
FACT_NUMS={'60万円','30万円','10万円','20万円','50万円','100万円','120万円','200万円','4週間','6週間','1週間','2週間','3週間','3か月','6か月','2時間','1時間','4時間','20年','1日','1本','2本','1人','2人','3つ','4つ','5つ'}
def texts(d):
    t=[('lead',d['lead'])]
    for s in d['sections']:
        t.append(('h2',s['h2']))
        for b in s['blocks']:
            x=b['x']
            if b['t']=='ul': t+=[('li',i) for i in x]
            elif b['t']=='table': t+=[('td',c) for r in x for c in r]
            else: t.append((b['t'],x))
    for f in d['faq']: t+=[('q',f['q']),('a',f['a'])]
    return t
rows=[]; allsent={}
for p in sorted(glob.glob(os.path.join(D,'*.json'))):
    try: d=json.load(open(p,encoding='utf-8'))
    except Exception as e: print('JSON NG',p,e); continue
    t=texts(d); full=''.join(x for _,x in t); n=len(re.sub(r'\s+','',full))
    ban=[w for w in BAN if w in full]
    longs=[s for k,x in t if k in('p','lead','a','note') for s in re.findall(r'[^。]+。',x) if len(s)>48]
    commas=[s for k,x in t if k in('p','lead','a') for s in re.findall(r'[^。]+。',x) if s.count('、')>=3]
    nums=sorted(set(m.group(0).replace(' ','') for m in OKNUM.finditer(full)))
    for k,x in t:
        if k in('p','a'):
            for s in re.findall(r'[^。]+。',x): allsent.setdefault(s,set()).add(d['slug'])
    issues=[]
    if n<2600: issues.append(f'字数{n}')
    if ban: issues.append('禁止語:'+','.join(ban))
    if not(5<=len(d['faq'])<=6): issues.append(f"FAQ{len(d['faq'])}問")
    if not(6<=len(d['sections'])<=8): issues.append(f"節{len(d['sections'])}")
    if len(d['title'])>60: issues.append(f"title{len(d['title'])}字")
    if not(100<=len(d['description'])<=135): issues.append(f"desc{len(d['description'])}字")
    rows.append((d['slug'],n,len(d['sections']),len(d['faq']),issues,len(longs),len(commas),nums))
print(f"{'slug':34}{'字数':>6} 節 FAQ  長文(>48字) 読点3以上  問題")
for s,n,a,b,iss,l,c,nums in rows: print(f"{s:34}{n:6} {a:2} {b:2}   {l:4}      {c:3}     {', '.join(iss) or 'OK'}")
dups=[(s,v) for s,v in allsent.items() if len(v)>1 and len(s)>25]
print('ページ間で同一の文:',len(dups))
for s,v in dups[:8]: print('  ',sorted(v),s[:50])
print('--- 登場する数値表現（事実と照合）')
for s,n,a,b,iss,l,c,nums in rows: print(s,nums)
