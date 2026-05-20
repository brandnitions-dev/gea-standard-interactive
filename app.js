/* The GEA STANDARD — interactive shell behavior.
 * Non-content UX only: navigation, search, theme, scroll, accessibility helpers.
 * No textual modifications to the GEA STANDARD content occur here.
 */
(function () {
  'use strict';

  const $  = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Theme toggle ---------------- */
  const themeBtn = $('#themeBtn');
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  }
  themeBtn?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });
  // Init aria-pressed
  if (themeBtn) themeBtn.setAttribute('aria-pressed',
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'true' : 'false');

  /* ---------------- Print ---------------- */
  $('#printBtn')?.addEventListener('click', () => window.print());

  /* ---------------- Sidebar (mobile) ---------------- */
  const sidebar     = $('#sidebar');
  const menuBtn     = $('#menuBtn');
  const closeBtn    = $('#sidebarClose');
  const backdrop    = $('#sidebarBackdrop');

  function openSidebar() {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  menuBtn?.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) closeSidebar(); else openSidebar();
  });
  closeBtn?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) closeSidebar();
  });
  // close sidebar on link click in mobile
  sidebar?.addEventListener('click', (e) => {
    const a = e.target.closest('a.toc-link');
    if (a && window.matchMedia('(max-width:1023px)').matches) closeSidebar();
  });

  /* ---------------- Standards-portal presentation ---------------- */
  function isPresentationReady(body) {
    return Boolean(body.querySelector('.gea-chapter-panel'))
      && (body.innerText || '').trim().length > 5000;
  }

  function enhanceDocumentPresentation() {
    const article = $('.content article.page');
    const body = $('.content article.page .page-body');
    if (!article || !body) return;
    if (isPresentationReady(body)) return;

    // Recover from a prior interrupted run (partial DOM + enhanced flag).
    if (body.dataset.enhanced === 'true') {
      body.removeAttribute('data-enhanced');
      article.classList.remove('gea-portal');
      document.querySelector('.doc-cockpit')?.remove();
    }

    try {
    article.classList.add('gea-portal');

    const originalChildren = Array.from(body.children);
    let currentChapter = null;
    let chapterCount = 0;

    originalChildren.forEach((node) => {
      const isRealH1 = node.tagName === 'H1' && node.textContent.trim();
      if (isRealH1) {
        chapterCount += 1;
        currentChapter = document.createElement('section');
        currentChapter.className = 'gea-chapter-panel';
        currentChapter.dataset.chapter = String(chapterCount).padStart(2, '0');
        currentChapter.setAttribute('aria-labelledby', node.id || '');
        body.appendChild(currentChapter);
      }
      if (currentChapter) currentChapter.appendChild(node);
      else node.classList.add('gea-prelude-node');
    });

    $$('.gea-chapter-panel', body).forEach((chapter) => {
      const chapterChildren = Array.from(chapter.children);
      let currentCard = null;
      let intro = document.createElement('div');
      intro.className = 'gea-chapter-intro';
      let introHasContent = false;

      chapterChildren.forEach((node) => {
        if (node.tagName === 'H1') {
          return;
        }

        if (node.tagName === 'H2') {
          if (!introHasContent && intro.parentNode) intro.remove();
          currentCard = document.createElement('section');
          currentCard.className = 'gea-standard-card';
          currentCard.setAttribute('aria-labelledby', node.id || '');
          chapter.appendChild(currentCard);
          currentCard.appendChild(node);
          return;
        }

        if (currentCard) {
          currentCard.appendChild(node);
        } else {
          introHasContent = true;
          intro.appendChild(node);
          if (!intro.parentNode) chapter.appendChild(intro);
        }
      });

      if (!introHasContent && intro.parentNode) intro.remove();
    });

    $$('.gea-standard-card', body).forEach((card) => {
      if ($('table', card)) card.classList.add('has-table');
      if ($('figure, img, iframe', card)) card.classList.add('has-media');
      if ($$('h3', card).length >= 4) card.classList.add('has-framework');
    });

    layoutMediaPerFigure(body);

    $$('.gea-standard-card, .gea-chapter-intro', body).forEach((el) => {
      el.classList.add('gea-prose');
    });

    $$('.gea-prelude-node', body).forEach((el) => el.remove());

    const cockpit = document.createElement('section');
    cockpit.className = 'doc-cockpit';
    cockpit.setAttribute('aria-label', 'Document controls and structure');
    cockpit.innerHTML = `
      <div class="doc-cockpit__panel">
        <div class="doc-cockpit__brand" aria-hidden="true">
          <span class="doc-cockpit__eyebrow">Standards portal</span>
          <span class="doc-cockpit__line"></span>
        </div>
        <div class="doc-cockpit__metrics" aria-label="Document structure">
          <span><strong>${$$('.gea-chapter-panel', body).length}</strong><small>Chapters</small></span>
          <span><strong>${$$('.gea-standard-card', body).length}</strong><small>Sections</small></span>
          <span><strong>${$$('table', article).length}</strong><small>Tables</small></span>
          <span><strong>${$$('img', article).length}</strong><small>Images</small></span>
        </div>
      </div>`;
    if (!document.querySelector('.doc-cockpit')) {
      article.parentNode.insertBefore(cockpit, article);
    }

    body.dataset.enhanced = 'true';
    document.documentElement.classList.add('gea-ready');
    } catch (err) {
      console.error('GEA presentation enhancement failed:', err);
      body.removeAttribute('data-enhanced');
      article.classList.remove('gea-portal');
      document.querySelector('.doc-cockpit')?.remove();
    }
  }

  /** Landscape diagrams (3:1 PNGs): always full-width stack, no side columns. */
  function layoutMediaPerFigure(root) {
    const LAYOUT = 'stack-wide';

    const isLeadFigure = (el) => {
      if (!el || el.tagName !== 'FIGURE') return false;
      if (el.classList.contains('callout')) return false;
      if (el.closest('.callout, .indented, table')) return false;
      return Boolean(el.querySelector('img, picture'));
    };

    const applyStackLayout = (container, figNode) => {
      container.dataset.mediaLayout = LAYOUT;
      container.classList.add(`gea-layout--${LAYOUT}`);
      const figure = figNode.tagName === 'FIGURE' ? figNode : figNode.querySelector('figure.image, figure');
      figure?.classList.add(`gea-figure--${LAYOUT}`);
      figure?.setAttribute('data-layout', LAYOUT);
    };

    const layoutContainer = (container) => {
      if (!container || container.dataset.mediaLayout) return;
      const figNode = Array.from(container.children).find(isLeadFigure);
      if (!figNode) return;
      applyStackLayout(container, figNode);
    };

    $$('.gea-standard-card.has-media', root).forEach(layoutContainer);
    $$('.gea-chapter-intro', root).forEach(layoutContainer);
  }

  function initImageLightbox() {
    if (document.body.dataset.lightboxReady === 'true') return;
    document.body.dataset.lightboxReady = 'true';

    const modal = document.createElement('div');
    modal.id = 'geaLightbox';
    modal.className = 'gea-lightbox';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="gea-lightbox__backdrop" data-close tabindex="-1"></div>
      <div class="gea-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Image preview">
        <button type="button" class="gea-lightbox__close" aria-label="Close preview">&times;</button>
        <div class="gea-lightbox__stage"></div>
      </div>`;
    document.body.appendChild(modal);

    const stage = $('.gea-lightbox__stage', modal);
    const closeBtn = $('.gea-lightbox__close', modal);
    let lastFocus = null;

    const close = () => {
      modal.hidden = true;
      stage.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus?.focus) lastFocus.focus({ preventScroll: true });
    };

    modal.querySelector('[data-close]')?.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (!modal.hidden && e.key === 'Escape') close();
    });

    const content = $('.content');
    content?.addEventListener('click', (e) => {
      const link = e.target.closest('figure.image a[href]');
      if (!link || !content.contains(link)) return;
      if (link.closest('.callout, .page-header-icon, .page-cover-image')) return;

      const href = link.getAttribute('href');
      if (!href || !/\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(href)) return;

      e.preventDefault();
      lastFocus = document.activeElement;

      const img = link.querySelector('img');
      const alt = img?.getAttribute('alt') || 'Diagram preview';
      const src = img?.getAttribute('src') || href;

      stage.innerHTML = '';
      const preview = document.createElement('img');
      preview.className = 'gea-lightbox__img';
      preview.src = src;
      preview.alt = alt;
      stage.appendChild(preview);

      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    });
  }

  /** Remove decorative Notion callout icon columns only (not content blocks). */
  function stripNotionCalloutIcons() {
    $$('.content .callout').forEach((callout) => {
      const iconCol = callout.querySelector(':scope > div:first-child');
      if (!iconCol || !iconCol.querySelector('.icon, img.icon, span.icon')) return;
      // Keep columns that carry real copy (nested callouts, paragraphs, etc.)
      if (iconCol.querySelector('figure, p, ul, ol, table, blockquote')) return;
      const textOnly = (iconCol.textContent || '').replace(/\s+/g, ' ').trim();
      if (textOnly.length > 8) return;
      iconCol.remove();
    });
  }

  /** Strip leading 📌 from VERA dimension footnotes. */
  function stripVerCycleNoteEmojis() {
    $$('.content p').forEach((p) => {
      const text = (p.textContent || '').trim();
      if (text.startsWith('📌')) {
        p.textContent = text.replace(/^📌\s*/u, '');
      }
    });
  }

  function runPostLoadEnhancements() {
    enhanceDocumentPresentation();
    stripNotionCalloutIcons();
    stripVerCycleNoteEmojis();
    initImageLightbox();
    normalizeNotionTables();
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(runPostLoadEnhancements, { timeout: 1500 });
  } else {
    setTimeout(runPostLoadEnhancements, 0);
  }

  /* ---------------- Notion table cleanup (header row overlap) ---------------- */
  /** Unwrap any external/database links inside tables (Notion export rows). */
  function neutralizeNotionTableLinks() {
    $$('.content table a[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#')) return;
      if (href.startsWith('./') || href.startsWith('../') || href.startsWith('/')) return;
      if (!/^https?:\/\//i.test(href)) return;
      const span = document.createElement('span');
      span.className = 'gea-table-text';
      span.innerHTML = a.innerHTML;
      a.replaceWith(span);
    });
  }

  function normalizeNotionTables() {
    neutralizeNotionTableLinks();
    $$('.content table').forEach((table) => {
      const firstRow = table.querySelector('tr');
      if (!firstRow) return;

      const isNotionHeader = Boolean(firstRow.querySelector('.property-icon'))
        || (firstRow.querySelectorAll('th').length > 0 && !firstRow.querySelector('td'));
      if (isNotionHeader) {
        firstRow.classList.add('gea-notion-header');
        firstRow.querySelectorAll('.property-icon').forEach((icon) => {
          icon.setAttribute('aria-hidden', 'true');
        });
      }

      if (!table.parentElement?.classList.contains('gea-table-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'gea-table-wrap';
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('aria-label', 'Scrollable data table');
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
    });
  }

  /* ---------------- TOC accordion (collapse/expand) ---------------- */
  $$('.toc-toggle', sidebar).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const li = btn.parentElement;
      const expanded = li.getAttribute('aria-expanded') === 'true';
      li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  /* ---------------- TOC scrollspy ---------------- */
  const tocLinks = new Map(); // id -> <a>
  $$('.toc-link[data-target]').forEach(a => tocLinks.set(a.getAttribute('data-target'), a));

  const headings = $$('.content [id]').filter(el =>
    /^H[1-6]$/.test(el.tagName) && tocLinks.has(el.id)
  );

  let activeLink = null;
  function setActive(id) {
    if (!id) return;
    const link = tocLinks.get(id);
    if (!link || link === activeLink) return;
    if (activeLink) activeLink.classList.remove('is-active');
    link.classList.add('is-active');
    activeLink = link;
    // ensure ancestor accordions are expanded so the active link is visible
    let parent = link.closest('.toc-item')?.parentElement?.closest('.toc-item');
    while (parent) {
      if (parent.getAttribute('aria-expanded') === 'false') {
        parent.setAttribute('aria-expanded', 'true');
        parent.querySelector(':scope > .toc-toggle')?.setAttribute('aria-expanded', 'true');
      }
      parent = parent.parentElement?.closest('.toc-item');
    }
    // scroll TOC into view (gently)
    const sb = sidebar;
    if (sb) {
      const r = link.getBoundingClientRect();
      const sr = sb.getBoundingClientRect();
      if (r.top < sr.top + 80 || r.bottom > sr.bottom - 40) {
        link.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }
  }

  if ('IntersectionObserver' in window && headings.length) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
      });
      if (visible.size) {
        // Choose the one closest to the top of the viewport
        const sorted = Array.from(visible).sort((a, b) =>
          a.getBoundingClientRect().top - b.getBoundingClientRect().top
        );
        setActive(sorted[0].id);
      } else {
        // Fallback: find last heading above the viewport top
        const top = 80;
        let last = null;
        for (const h of headings) {
          const r = h.getBoundingClientRect();
          if (r.top <= top) last = h;
          else break;
        }
        if (last) setActive(last.id);
      }
    }, { rootMargin: '-72px 0px -65% 0px', threshold: [0, 1] });
    headings.forEach(h => io.observe(h));
  }

  /* ---------------- Reading progress ---------------- */
  const progressBar = $('.reading-progress__bar');
  const backToTop = $('#backToTop');
  function onScroll() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    if (progressBar) progressBar.style.width = pct + '%';
    if (backToTop) {
      const should = window.scrollY > 480;
      if (should && backToTop.hasAttribute('hidden')) backToTop.removeAttribute('hidden');
      else if (!should && !backToTop.hasAttribute('hidden')) backToTop.setAttribute('hidden', '');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  });

  /* ---------------- Search ---------------- */
  const headingsIndex = Array.isArray(window.GEA_HEADINGS) ? window.GEA_HEADINGS : [];
  const searchInput = $('#searchInput');
  const searchClear = $('#searchClear');
  const searchResults = $('#searchResults');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) +
           '<mark>' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' +
           escapeHtml(text.slice(idx + q.length));
  }

  function runSearch(q) {
    q = (q || '').trim();
    if (!q) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
      // also clear any TOC filter
      $$('.toc-item').forEach(li => li.classList.remove('is-hidden'));
      searchClear.hidden = true;
      return;
    }
    searchClear.hidden = false;

    const ql = q.toLowerCase();
    const matches = headingsIndex
      .map(h => ({ h, score: scoreMatch(h.text.toLowerCase(), ql) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);

    // Render dropdown
    if (!matches.length) {
      searchResults.innerHTML = '<div class="search-results__empty">No sections match “' + escapeHtml(q) + '”.</div>';
    } else {
      searchResults.innerHTML = matches.map((m, i) => {
        const level = 'H' + m.h.level;
        return `<a href="#${m.h.id}" data-id="${m.h.id}" role="option" tabindex="-1" id="sr-${i}">
          <span class="result-level">${level}</span>${highlight(m.h.text, q)}
        </a>`;
      }).join('');
    }
    searchResults.hidden = false;

    // Filter the TOC (keep matches + their ancestor chain visible)
    const matchIds = new Set(matches.map(m => m.h.id));
    $$('.toc-item').forEach(li => {
      const link = li.querySelector(':scope > .toc-link');
      const id = link?.getAttribute('data-target');
      const directMatch = id && matchIds.has(id);
      const hasDescendantMatch = li.querySelectorAll('.toc-link[data-target]')
        .length && Array.from(li.querySelectorAll('.toc-link[data-target]')).some(a =>
          matchIds.has(a.getAttribute('data-target')));
      li.classList.toggle('is-hidden', !(directMatch || hasDescendantMatch));
      // Expand if ancestor of a match
      if (hasDescendantMatch && li.hasAttribute('aria-expanded')) {
        li.setAttribute('aria-expanded', 'true');
        li.querySelector(':scope > .toc-toggle')?.setAttribute('aria-expanded', 'true');
      }
    });
  }
  function scoreMatch(text, q) {
    if (!text || !q) return 0;
    if (text === q) return 100;
    if (text.startsWith(q)) return 80;
    const words = text.split(/\s+/);
    if (words.some(w => w.startsWith(q))) return 60;
    if (text.includes(q)) return 40;
    return 0;
  }

  let debounce;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(e.target.value), 80);
  });
  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    runSearch('');
    searchInput.focus();
  });
  searchInput?.addEventListener('focus', () => {
    if (searchInput.value.trim()) runSearch(searchInput.value);
  });
  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.hidden = true;
    }
  });
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (searchInput.value) {
        searchInput.value = '';
        runSearch('');
      } else {
        searchResults.hidden = true;
      }
    }
    if (e.key === 'ArrowDown') {
      const first = searchResults.querySelector('a');
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  searchResults?.addEventListener('keydown', (e) => {
    const items = $$('a', searchResults);
    if (!items.length) return;
    const cur = document.activeElement;
    const idx = items.indexOf(cur);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(items.length - 1, idx + 1)].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx <= 0) searchInput.focus(); else items[idx - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      searchResults.hidden = true;
      searchInput.focus();
    }
  });
  searchResults?.addEventListener('click', () => { searchResults.hidden = true; });

  // Keyboard shortcut: "/" focuses search
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.key === '/') {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    }
  });

  /* ---------------- Smooth scrolling for in-page links ---------------- */
  // Native scroll-behavior:smooth handles most cases. We update history without
  // jumping, and focus the target for screen readers.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.setAttribute('tabindex', '-1');
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  });

  /* ---------------- Open external links in new tab ---------------- */
  $$('main a[href^="http"]').forEach(a => {
    try {
      const u = new URL(a.href);
      if (u.host !== location.host) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    } catch (e) {}
  });

  /* ---------------- Initial state ---------------- */
  // Default-expand level-0 TOC items, collapse deeper
  $$('.toc-list.toc-depth-0 > .toc-item').forEach(li => {
    if (li.hasAttribute('aria-expanded')) {
      // already set by template (depth-0 default true). Keep it.
    }
  });

  // If URL has a hash, ensure ancestor accordions are open
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) setActive(id);
  }
})();
