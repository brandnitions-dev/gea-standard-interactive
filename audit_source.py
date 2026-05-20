"""Audit the source HTML for content parity baseline."""
from bs4 import BeautifulSoup
import json, re, hashlib

with open('/home/user/workspace/GEA-STANDARD.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

# Strip the sidebar nav (it's a generated TOC, not source content)
nav = soup.find('nav', class_='sticky-sidebar')
nav_text = nav.get_text(separator=' | ', strip=True) if nav else ''

# Find the main content - everything outside nav
# Source body contains nav + content. Identify the content root.
body = soup.body
# Get all top-level children of body excluding nav
content_nodes = [c for c in body.children if getattr(c, 'name', None) and c is not nav]

# Counts
headings = []
for tag in ['h1','h2','h3','h4','h5','h6']:
    for el in soup.find_all(tag):
        if nav and el in nav.descendants:
            continue
        headings.append((tag, el.get_text(' ', strip=True)))

paragraphs = []
for el in soup.find_all('p'):
    if nav and el in nav.descendants:
        continue
    txt = el.get_text(' ', strip=True)
    if txt:
        paragraphs.append(txt)

images = []
for el in soup.find_all('img'):
    if nav and el in nav.descendants:
        continue
    images.append({'src': el.get('src',''), 'alt': el.get('alt','')})

tables = []
for el in soup.find_all('table'):
    if nav and el in nav.descendants:
        continue
    rows = el.find_all('tr')
    cells = sum(len(r.find_all(['td','th'])) for r in rows)
    tables.append({'rows': len(rows), 'cells': cells, 'text_preview': el.get_text(' ', strip=True)[:120]})

lists = {'ul': 0, 'ol': 0, 'li': 0}
for tag in ['ul','ol']:
    for el in soup.find_all(tag):
        if nav and el in nav.descendants:
            continue
        lists[tag] += 1
for el in soup.find_all('li'):
    if nav and el in nav.descendants:
        continue
    lists['li'] += 1

links = []
for el in soup.find_all('a'):
    if nav and el in nav.descendants:
        continue
    href = el.get('href','')
    txt = el.get_text(' ', strip=True)
    if href:
        links.append({'href': href, 'text': txt})

# Full content text (excluding nav)
content_text_parts = []
for n in content_nodes:
    content_text_parts.append(n.get_text(' ', strip=True))
full_text = ' '.join(content_text_parts)
# Normalize whitespace
full_text_norm = re.sub(r'\s+', ' ', full_text).strip()
word_count = len(full_text_norm.split())
char_count = len(full_text_norm)

audit = {
    'headings_count': len(headings),
    'paragraphs_count': len(paragraphs),
    'images_count': len(images),
    'tables_count': len(tables),
    'lists': lists,
    'links_count': len(links),
    'word_count': word_count,
    'char_count': char_count,
    'content_sha256': hashlib.sha256(full_text_norm.encode()).hexdigest(),
}

print(json.dumps(audit, indent=2))

with open('/home/user/workspace/audit_source.json', 'w') as f:
    json.dump({
        **audit,
        'headings': headings,
        'images': images,
        'tables': tables,
        'links': links,
        'paragraphs_sample_first_5': paragraphs[:5],
        'paragraphs_sample_last_5': paragraphs[-5:],
        'full_text_normalized': full_text_norm,
    }, f, indent=2)
print("Saved audit_source.json")
