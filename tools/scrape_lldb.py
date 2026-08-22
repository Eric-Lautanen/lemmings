import urllib.request, re, json, sys, time

BASE = 'https://lldb.camanis.net'
pack_slugs = ['DOS-Fun', 'DOS-Tricky', 'DOS-Taxing', 'DOS-Mayhem']

def get(url, tries=3):
    for t in range(tries):
        try:
            return urllib.request.urlopen(url, timeout=30).read().decode('utf-8', 'replace')
        except Exception as e:
            if t == tries - 1:
                raise
            time.sleep(2)

out = {}
for p, slug in zip([473, 474, 475, 476], pack_slugs):
    ph = get(f'{BASE}/levelpack/{p}/{slug}')
    links = re.findall(r'href="(/level/%d/(\d+)/[^"]+)"' % p, ph)
    seen = {}
    for href, num in links:
        n = int(num)
        if n in seen:
            continue
        seen[n] = href
    if not seen:
        # retry with explicit pack name slug unknown; try the numeric pack list page
        raise RuntimeError(f'no level links for pack {p}')
    for n in sorted(seen):
        url = BASE + seen[n]
        h = get(url)
        m = re.search(r'Goal:\s*(.*?)</p>', h, re.S)
        body = re.sub(r'<[^>]+>', ' ', m.group(1)) if m else ''
        body = re.sub(r'\s+', ' ', body).strip()
        m2 = re.search(r'Save (\d+) of (\d+) within (\d+) minutes?\.', body)
        m3 = re.search(r'Release rate:\s*(\d+)', body)
        m4 = re.search(r'Skills:\s*([\d\s]+)$', body)
        rec = None
        if m2 and m3:
            rec = dict(save=int(m2.group(1)), lems=int(m2.group(2)), time=int(m2.group(3)), rate=int(m3.group(1)))
        if rec:
            out[f'{p}/{n}'] = rec
        print(f'{p}/{n:2d} {body[:90]}')
        time.sleep(0.3)

json.dump(out, open(sys.path[0] + r'\dos_stats.json', 'w'), indent=1)
print('TOTAL', len(out))