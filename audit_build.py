"""Compare the rebuilt site's content parity against the canonical source."""
from bs4 import BeautifulSoup
import json, re, hashlib, sys

SRC = '/home/user/workspace/GEA-STANDARD.html'
BUILT = '/home/user/workspace/gea-standard-site/index.html'

def get_article_content(html_path, drop_sticky_sidebar=True):
    s = BeautifulSoup(open(html_path, 'r', encoding='utf-8'), 'html.parser')
    # canonical source has an extra body-level nav that we never used
    if drop_sticky_sidebar:
        nav = s.find('nav', class_='sticky-sidebar')
        if nav: nav.decompose()
    art = s.find('article', class_='page')
    return s, art

def stats(article, root_soup):
    headings = article.find_all(['h1','h2','h3','h4','h5','h6'])
    paragraphs = [p for p in article.find_all('p') if p.get_text(' ',strip=True)]
    images = article.find_all('img')
    tables = article.find_all('table')
    ul = article.find_all('ul')
    ol = article.find_all('ol')
    li = article.find_all('li')
    a = [x for x in article.find_all('a') if x.get('href')]
    # Strip TOC nav inside article for substantive-text comparison
    art_clone = BeautifulSoup(str(article), 'html.parser')
    # text including inline TOC (TOC is real DOM text in both)
    full = art_clone.get_text(' ', strip=True)
    full = re.sub(r'\s+', ' ', full).strip()
    return {
        'headings': len(headings),
        'paragraphs': len(paragraphs),
        'images': len(images),
        'tables': len(tables),
        'ul': len(ul), 'ol': len(ol), 'li': len(li),
        'links': len(a),
        'words': len(full.split()),
        'chars': len(full),
        'sha256': hashlib.sha256(full.encode()).hexdigest(),
        'image_srcs': [i.get('src','') for i in images],
        'link_hrefs': [x.get('href','') for x in a],
    }

src_soup, src_art = get_article_content(SRC)
bld_soup, bld_art = get_article_content(BUILT, drop_sticky_sidebar=False)

src = stats(src_art, src_soup)
bld = stats(bld_art, bld_soup)

def diff_row(name, a, b):
    delta = b - a
    mark = "OK" if delta == 0 else ("DIFF " + ("+" if delta > 0 else "") + str(delta))
    print(f"  {name:14s} source={a:>6d}   built={b:>6d}   {mark}")

print("=" * 60)
print("PRESERVATION AUDIT — source vs. built")
print("=" * 60)
for k in ['headings','paragraphs','images','tables','ul','ol','li','links','words','chars']:
    diff_row(k, src[k], bld[k])
print(f"  sha256 source = {src['sha256']}")
print(f"  sha256 built  = {bld['sha256']}")
print(f"  text equal    = {src['sha256'] == bld['sha256']}")

# Image src equivalence ignoring path rewrite
def norm_img(s):
    # remove leading paths
    s = s.replace('./GEA STANDARD_files/', '').replace('./assets/', '').replace('GEA STANDARD_files/', '').replace('assets/', '')
    return s

src_imgs = sorted(norm_img(s) for s in src['image_srcs'])
bld_imgs = sorted(norm_img(s) for s in bld['image_srcs'])
print("\nImage parity (path-normalized):", "OK" if src_imgs == bld_imgs else "DIFF")
if src_imgs != bld_imgs:
    only_src = set(src_imgs) - set(bld_imgs)
    only_bld = set(bld_imgs) - set(src_imgs)
    if only_src: print("  only in source:", list(only_src)[:10])
    if only_bld: print("  only in built:", list(only_bld)[:10])

# Link parity (normalized: in-page anchor rewrite)
def norm_link(h):
    m = re.match(r'^https?://geaadmin\.github\.io/geastd/?#(.+)$', h)
    if m: return '#' + m.group(1)
    if h.rstrip('/') == 'https://geaadmin.github.io/geastd': return '#top'
    # asset-path rewrite is non-content
    h = h.replace('./GEA STANDARD_files/', './assets/')
    h = h.replace('GEA STANDARD_files/', 'assets/')
    return h

src_links = sorted(norm_link(h) for h in src['link_hrefs'])
bld_links = sorted(norm_link(h) for h in bld['link_hrefs'])
print("Link parity (anchor-normalized):", "OK" if src_links == bld_links else "DIFF")
if src_links != bld_links:
    only_src = list(set(src_links) - set(bld_links))[:5]
    only_bld = list(set(bld_links) - set(src_links))[:5]
    print("  only in source:", only_src)
    print("  only in built:", only_bld)

# Headings text parity
def heading_texts(art):
    return [h.get_text(' ', strip=True) for h in art.find_all(['h1','h2','h3','h4','h5','h6'])]
sh, bh = heading_texts(src_art), heading_texts(bld_art)
print("Heading text list equal:", sh == bh)

# Table cell parity (per-table cell count + concatenated text)
def table_sig(art):
    sigs = []
    for t in art.find_all('table'):
        rows = t.find_all('tr')
        cells = [c.get_text(' ', strip=True) for r in rows for c in r.find_all(['td','th'])]
        sigs.append((len(rows), len(cells), hashlib.sha256(' '.join(cells).encode()).hexdigest()[:16]))
    return sigs
ts, tb = table_sig(src_art), table_sig(bld_art)
print("Table signatures equal:", ts == tb)

# Save full audit JSON
with open('/home/user/workspace/audit_compare.json', 'w') as f:
    json.dump({
        'source': {k: v for k, v in src.items() if k not in ('image_srcs','link_hrefs')},
        'built':  {k: v for k, v in bld.items() if k not in ('image_srcs','link_hrefs')},
        'headings_equal': sh == bh,
        'tables_equal':   ts == tb,
        'images_equal':   src_imgs == bld_imgs,
        'links_equal':    src_links == bld_links,
    }, f, indent=2)
print("\nSaved /home/user/workspace/audit_compare.json")
