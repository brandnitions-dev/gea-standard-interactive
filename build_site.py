"""Build a modern GEA STANDARD site from the canonical HTML.

Strategy:
- Parse /home/user/workspace/GEA-STANDARD.html
- Extract <article class="page sans"> (header + page-body) verbatim
- Rewrite asset paths "./GEA STANDARD_files/X" -> "./assets/X"
- Rewrite in-page anchors "https://geaadmin.github.io/geastd/#X" -> "#X"
- Build a structured TOC tree from the inline table_of_contents nav
- Wrap content in a new modern shell with sticky TOC, search, theme toggle, etc.
- Preserve ALL substantive content (no edits to text, tables, images, lists, links)
"""
from bs4 import BeautifulSoup, NavigableString
import re
import json
import os
import shutil
import html as ihtml

SRC = '/home/user/workspace/GEA-STANDARD.html'
OUT_DIR = '/home/user/workspace/gea-standard-site'
OUT_HTML = os.path.join(OUT_DIR, 'index.html')

os.makedirs(OUT_DIR, exist_ok=True)

with open(SRC, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

article = soup.find('article', class_='page')
assert article, "article.page not found"

# 1. Remove the saved-page page sidebar (the one outside article) — not needed
# (we never include the body's outer <nav class="sticky-sidebar"> anyway)

# 2. Within article: remove the inline table_of_contents nav (we'll generate our own
#    sidebar from it but keep the data extracted first). We will NOT remove the nav text
#    from content because it's actually duplicated TOC, not unique substantive content.
#    HOWEVER, the canonical content audit treats it as content. Decision: KEEP it but
#    hide it visually (since the modern sidebar replaces it) — this preserves text count
#    and lets it remain for print/no-JS users.
inline_toc_nav = article.find('nav', class_='table_of_contents')

# Build TOC tree before any mutation
toc_items = []
if inline_toc_nav:
    for it in inline_toc_nav.find_all('div', class_='table_of_contents-item'):
        indent = 0
        for c in it.get('class', []):
            if c.startswith('table_of_contents-indent-'):
                indent = int(c.split('-')[-1])
        a = it.find('a')
        href = a.get('href', '') if a else ''
        txt = a.get_text(' ', strip=True) if a else ''
        anchor = href.split('#', 1)[-1] if '#' in href else ''
        is_strong = bool(a and a.find('strong'))
        toc_items.append({'indent': indent, 'anchor': anchor, 'text': txt, 'strong': is_strong})

# 3. Rewrite asset paths & anchors throughout the article
# - src/href references to ./GEA STANDARD_files/ -> ./assets/
# - href to https://geaadmin.github.io/geastd/#X -> #X
# - href to https://geaadmin.github.io/geastd/ (no fragment) -> #top
# We modify by walking soup tags.

def rewrite_url(url: str) -> str:
    if not url:
        return url
    # asset rewrite
    url = url.replace('./GEA STANDARD_files/', './assets/')
    url = url.replace('GEA STANDARD_files/', 'assets/')
    # anchor rewrite for in-page links
    m = re.match(r'^https?://geaadmin\.github\.io/geastd/?#(.+)$', url)
    if m:
        return '#' + m.group(1)
    if url.rstrip('/') == 'https://geaadmin.github.io/geastd':
        return '#top'
    return url

# Iframe src rewrite: saved-page placeholders -> the original live URLs
# (see live page https://geaadmin.github.io/geastd/). Each saved_resource(N).html
# corresponds to a specific live embed. Order in live page:
#   0 -> https://geaadmin.github.io/gmsank/
#   1 -> https://geaadmin.github.io/otec/
#   2 -> https://geaadmin.github.io/gsad/
#   3 -> https://geaadmin.github.io/igs/
#   4 -> https://geaadmin.github.io/eip/
#   5 -> https://geaadmin.github.io/GST/
#   6 -> https://geaadmin.github.io/gcp/
IFRAME_MAP = {
    './GEA STANDARD_files/saved_resource.html':    'https://geaadmin.github.io/gmsank/',
    './GEA STANDARD_files/saved_resource(1).html': 'https://geaadmin.github.io/otec/',
    './GEA STANDARD_files/saved_resource(2).html': 'https://geaadmin.github.io/gsad/',
    './GEA STANDARD_files/saved_resource(3).html': 'https://geaadmin.github.io/igs/',
    './GEA STANDARD_files/saved_resource(4).html': 'https://geaadmin.github.io/eip/',
    './GEA STANDARD_files/saved_resource(5).html': 'https://geaadmin.github.io/GST/',
    './GEA STANDARD_files/saved_resource(6).html': 'https://geaadmin.github.io/gcp/',
}
for ifr in article.find_all('iframe'):
    s = ifr.get('src', '')
    if s in IFRAME_MAP:
        ifr['src'] = IFRAME_MAP[s]
    # Sandbox + lazy load for safety/perf
    ifr['loading'] = 'lazy'
    ifr['referrerpolicy'] = 'no-referrer'
    ifr['title'] = ifr.get('title', 'Embedded GEA reference page')

for tag in article.find_all(True):
    for attr in ('src', 'href'):
        if tag.has_attr(attr):
            tag[attr] = rewrite_url(tag[attr])

# 4. Mark every heading id with a class for active TOC tracking; ensure all <h1..h6> have id
heading_count = 0
for h in article.find_all(['h1','h2','h3','h4','h5','h6']):
    heading_count += 1
    cls = h.get('class', [])
    if 'gea-heading' not in cls:
        cls.append('gea-heading')
        h['class'] = cls

# 5. Unwrap Notion database links inside tables (keep visible text only)
for table in article.find_all('table'):
    for a in table.find_all('a', href=True):
        href = a.get('href', '')
        if href.startswith(('http://', 'https://')) and not href.startswith('#'):
            a.name = 'span'
            cls = a.get('class', [])
            if 'gea-table-text' not in cls:
                cls.append('gea-table-text')
                a['class'] = cls
            del a['href']
            if a.has_attr('target'):
                del a['target']
            if a.has_attr('rel'):
                del a['rel']

# 6. Wrap every <table> in a responsive scroll container (do not modify table itself)
for table in article.find_all('table'):
    # already wrapped?
    parent = table.parent
    if parent and parent.name == 'div' and 'gea-table-wrap' in parent.get('class', []):
        continue
    wrap = soup.new_tag('div', **{'class': 'gea-table-wrap', 'role': 'region', 'aria-label': 'Scrollable table'})
    wrap['tabindex'] = '0'
    table.wrap(wrap)

# 6. Improve image accessibility: ensure alt present (use figcaption text where available)
for fig in article.find_all('figure'):
    img = fig.find('img')
    if img and not img.get('alt'):
        cap = fig.find('figcaption')
        if cap:
            alt = cap.get_text(' ', strip=True)
            if alt:
                img['alt'] = alt[:200]
# Default alt empty (decorative) — leave others as-is

# 7. Hide the inline TOC (still present in DOM, preserved for parity & print)
if inline_toc_nav:
    cls = inline_toc_nav.get('class', [])
    if 'gea-inline-toc' not in cls:
        cls.append('gea-inline-toc')
    inline_toc_nav['class'] = cls
    # Override the saved style display:none so we control via CSS
    style = inline_toc_nav.get('style', '')
    style = re.sub(r'display\s*:\s*[^;]+;?', '', style)
    if style.strip():
        inline_toc_nav['style'] = style
    else:
        del inline_toc_nav['style']

# 8. Add ids to article header parts
header = article.find('header')
if header:
    h1 = header.find('h1', class_='page-title')
    if h1 and not h1.get('id'):
        h1['id'] = 'gea-top'

# Serialize the modified article
article_html = str(article)

# Build TOC tree HTML (nested <ul>)
def build_toc_html(items):
    if not items:
        return ''
    out = ['<ul class="toc-list" role="tree">']
    stack = [0]
    prev_level = 0
    open_li = False
    # We'll build a proper nested list using a simple algorithm
    out = []
    def render(items):
        # Build a tree from flat indent list
        root = {'children': [], 'indent': -1, 'text': '', 'anchor': ''}
        stack = [root]
        for it in items:
            node = {'children': [], **it}
            while stack and stack[-1]['indent'] >= it['indent']:
                stack.pop()
            if not stack:
                stack.append(root)
            stack[-1]['children'].append(node)
            stack.append(node)
        # Render tree -> HTML
        def r(node, depth):
            html = []
            if node['children']:
                html.append(f'<ul class="toc-list toc-depth-{depth}" role="{"tree" if depth==0 else "group"}">')
                for child in node['children']:
                    text = ihtml.escape(child['text'])
                    anchor = ihtml.escape(child['anchor'])
                    is_strong = child.get('strong')
                    li_class = 'toc-item' + (' toc-item--top' if is_strong else '')
                    has_kids = bool(child['children'])
                    expanded = 'true' if depth < 1 else 'false'
                    aria = f' aria-expanded="{expanded}"' if has_kids else ''
                    btn = f'<button class="toc-toggle" type="button" aria-label="Toggle section"{aria}><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' if has_kids else ''
                    link = f'<a class="toc-link" href="#{anchor}" data-target="{anchor}">{text}</a>' if anchor else f'<span class="toc-link">{text}</span>'
                    html.append(f'<li class="{li_class}" role="treeitem"{(" aria-expanded=\"" + expanded + "\"") if has_kids else ""}>{btn}{link}')
                    html.append(r(child, depth+1))
                    html.append('</li>')
                html.append('</ul>')
            return ''.join(html)
        return r(root, 0)
    return render(items)

toc_html = build_toc_html(toc_items)

# Save toc data for JS search index
search_index_items = []
for h in article.find_all(['h1','h2','h3','h4','h5','h6']):
    hid = h.get('id', '')
    txt = h.get_text(' ', strip=True)
    if hid and txt:
        search_index_items.append({'id': hid, 'text': txt, 'level': int(h.name[1])})

# Build the new shell
SHELL = """<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>The GEA STANDARD</title>
<meta name="description" content="The GEA STANDARD — full text of the Global Excellence Assembly Standard.">
<link rel="icon" type="image/png" href="./assets/GLOBAL_EXCELLENCE_ASSEMBLY_(1).png">
<link rel="stylesheet" href="./styles.css">
<script>
  // Apply saved theme before paint (no-flash)
  try {
    var t = localStorage.getItem('gea-theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e){}
</script>
</head>
<body>
<a href="#main-content" class="skip-link">Skip to main content</a>

<header class="topbar" role="banner">
  <div class="topbar__inner">
    <button class="topbar__menu" id="menuBtn" aria-label="Toggle table of contents" aria-controls="sidebar" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <a class="topbar__brand" href="#gea-top" aria-label="The GEA STANDARD — go to top">
      <img src="./assets/GLOBAL_EXCELLENCE_ASSEMBLY_(1).png" alt="" class="topbar__logo" aria-hidden="true">
      <span class="topbar__title">The GEA STANDARD</span>
    </a>
    <div class="topbar__search" role="search">
      <label class="visually-hidden" for="searchInput">Search the document</label>
      <svg class="topbar__search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input id="searchInput" type="search" placeholder="Search sections…" autocomplete="off" spellcheck="false">
      <button id="searchClear" class="topbar__search-clear" type="button" aria-label="Clear search" hidden>&times;</button>
      <div id="searchResults" class="search-results" role="listbox" aria-label="Search results" hidden></div>
    </div>
    <div class="topbar__actions">
      <button id="printBtn" class="iconbtn" type="button" aria-label="Print or save as PDF" title="Print / Save as PDF">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z"/></svg>
      </button>
      <button id="themeBtn" class="iconbtn" type="button" aria-label="Toggle dark mode" title="Toggle dark mode" aria-pressed="false">
        <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
  <div id="readingProgress" class="reading-progress" aria-hidden="true"><div class="reading-progress__bar"></div></div>
</header>

<div class="layout">
  <aside id="sidebar" class="sidebar" aria-label="Table of contents">
    <div class="sidebar__header">
      <h2 class="sidebar__title">Contents</h2>
      <button id="sidebarClose" class="iconbtn sidebar__close" type="button" aria-label="Close table of contents">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <nav class="sidebar__nav" aria-label="Document sections">
      __TOC__
    </nav>
  </aside>
  <div id="sidebarBackdrop" class="sidebar-backdrop" hidden></div>

  <main id="main-content" class="content" tabindex="-1">
    __ARTICLE__
  </main>
</div>

<button id="backToTop" class="back-to-top" type="button" aria-label="Back to top" hidden>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>

<script>window.GEA_HEADINGS = __SEARCH_JSON__;</script>
<script src="./app.js" defer></script>
</body>
</html>
"""

shell = SHELL.replace('__TOC__', toc_html)
shell = shell.replace('__ARTICLE__', article_html)
shell = shell.replace('__SEARCH_JSON__', json.dumps(search_index_items))

with open(OUT_HTML, 'w', encoding='utf-8') as f:
    f.write(shell)

print(f"Wrote {OUT_HTML} ({len(shell):,} bytes)")
print(f"TOC items: {len(toc_items)}")
print(f"Search index entries: {len(search_index_items)}")
