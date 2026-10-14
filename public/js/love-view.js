(function () {
    'use strict';
    const path = window.location.pathname.replace(/\/$/, '');
    const section = path.startsWith('/love-view/genres') ? 'genres' : /^\/love-view\/(management|create|edit)(\/|$)/.test(path) ? 'management' : path === '/love-view' ? 'collection' : null;
    document.querySelectorAll('[data-lv-nav]').forEach(function (link) {
        const active = link.dataset.lvNav === section;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('.lv-pill-active, .lv-gpill.active').forEach(function (link) { link.setAttribute('aria-current', 'true'); });
    document.querySelectorAll('[data-confirm]').forEach(function (link) {
        link.addEventListener('click', function (event) { if (!window.confirm(link.dataset.confirm)) event.preventDefault(); });
    });

    const groups = [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.querySelectorAll('[data-cascade]').forEach(function (card) {
        const tray = document.getElementById(card.dataset.cascade);
        const button = card.querySelector('.lv-card-toggle');
        if (!tray || !button) return;
        const seasons = Array.from(tray.querySelectorAll('.lv-cascade-item'));
        const seasonNumber = function (item) {
            const label = item.querySelector('.lv-season-chip');
            const number = label ? Number(label.textContent.replace(/^T/, '').trim()) : NaN;
            return Number.isFinite(number) && number > 0 ? number : Infinity;
        };
        seasons.sort(function (a, b) { return seasonNumber(a) - seasonNumber(b); }).forEach(function (item) { tray.appendChild(item); });
        const pendingRating = seasons.some(function (item) {
            const badge = item.querySelector('.lv-unrated-badge');
            return badge && !badge.hidden;
        });
        const groupBadge = card.querySelector('.lv-unrated-badge');
        if (groupBadge && pendingRating) {
            groupBadge.hidden = false;
            groupBadge.title = 'Falta calificar al menos una de las entradas de este título.';
        }
        const group = { card, tray, button };
        groups.push(group);
        tray.hidden = true;
        function toggle() {
            const open = tray.hidden;
            groups.forEach(closeGroup);
            if (!open) return;
            const column = card.closest('.lv-col');
            const top = column.getBoundingClientRect().top;
            const row = Array.from(column.parentElement.children).filter(function (child) {
                return child.classList.contains('lv-col') && !child.hidden && Math.abs(child.getBoundingClientRect().top - top) < 3;
            });
            (row[row.length - 1] || column).after(tray);
            tray.hidden = false;
            tray.classList.add('lv-cascade-open');
            card.classList.add('lv-pcard-expanded');
            button.setAttribute('aria-expanded', 'true');
            const chevron = button.querySelector('.lv-cascade-chev');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
            if (tray.getBoundingClientRect().top > window.innerHeight - 100) tray.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        }
        card.addEventListener('click', function (event) { if (!event.target.closest('a')) toggle(); });
        const close = tray.querySelector('[data-close-cascade]');
        if (close) close.addEventListener('click', function () { closeGroup(group); button.focus({ preventScroll: true }); });
    });
    function closeGroup(group) {
        group.tray.hidden = true;
        group.tray.classList.remove('lv-cascade-open');
        group.card.classList.remove('lv-pcard-expanded');
        group.button.setAttribute('aria-expanded', 'false');
        const chevron = group.button.querySelector('.lv-cascade-chev');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
    window.addEventListener('resize', function () { groups.forEach(closeGroup); });

    const search = document.getElementById('lvSearch');
    if (!search) return;
    const form = document.getElementById('lvSearchForm');
    const count = document.getElementById('lvResultCount');
    const empty = document.getElementById('lvSearchEmpty');
    const reset = document.getElementById('lvResetFilters');
    const sections = Array.from(document.querySelectorAll('.lv-section'));
    const cards = sections.flatMap(function (section) {
        return Array.from(section.querySelector('.lv-grid').children).filter(function (child) { return child.classList.contains('lv-col'); });
    });
    const normalize = function (value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
    cards.forEach(function (column) { column.dataset.searchTitle = normalize(column.querySelector('.lv-pcard-title').textContent); });
    function filter(updateUrl) {
        const term = normalize(search.value);
        groups.forEach(closeGroup);
        let visible = 0;
        cards.forEach(function (column) { column.hidden = !column.dataset.searchTitle.includes(term); if (!column.hidden) visible++; });
        sections.forEach(function (section) {
            const number = Array.from(section.querySelector('.lv-grid').children).filter(function (child) { return child.classList.contains('lv-col') && !child.hidden; }).length;
            section.hidden = Boolean(term) && number === 0;
            section.querySelector('.lv-scount').textContent = String(number);
        });
        count.textContent = term ? visible + ' de ' + cards.length + ' títulos' : cards.length + (cards.length === 1 ? ' título en la colección' : ' títulos en la colección');
        empty.hidden = !term || visible > 0;
        document.querySelector('.lv-search-box [data-clear-search]').hidden = !search.value;
        document.querySelectorAll('.lv-filter-bar a[href]:not([data-clear-filters])').forEach(function (link) {
            const target = new URL(link.href);
            if (search.value.trim()) target.searchParams.set('q', search.value.trim()); else target.searchParams.delete('q');
            link.href = target.pathname + target.search;
        });
        const url = new URL(window.location.href);
        if (search.value.trim()) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
        reset.hidden = !['q', 'type', 'status', 'genre'].some(function (key) { return Boolean(url.searchParams.get(key)); });
        if (updateUrl) window.history.replaceState(null, '', url.pathname + url.search);
    }
    search.value = new URLSearchParams(window.location.search).get('q') || '';
    form.addEventListener('submit', function (event) { event.preventDefault(); filter(true); });
    search.addEventListener('input', function () { filter(true); });
    document.querySelectorAll('[data-clear-search]').forEach(function (button) {
        button.addEventListener('click', function () { search.value = ''; filter(true); search.focus(); });
    });
    window.addEventListener('pageshow', function (event) { if (event.persisted) { search.value = new URLSearchParams(window.location.search).get('q') || ''; filter(false); } });
    filter(false);
})();
