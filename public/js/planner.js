(() => {
    const section = location.pathname.startsWith('/places') ? 'places' : 'dates';
    document.querySelectorAll('[data-ed-nav]').forEach(link => {
        if (link.dataset.edNav === section) {
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'page');
        }
    });

    const collection = document.querySelector('[data-ed-collection]');
    if (collection) {
        const search = collection.querySelector('[data-ed-search]');
        const sort = collection.querySelector('[data-ed-sort]');
        const grid = collection.querySelector('[data-ed-grid]');
        const cards = [...collection.querySelectorAll('[data-ed-card]')];
        const empty = collection.querySelector('[data-ed-no-results]');
        const status = collection.querySelector('[data-ed-results]');
        const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
        function update() {
            const query = normalize(search?.value.trim() || '');
            let visible = 0;
            cards.forEach(card => {
                card.hidden = !normalize(`${card.dataset.edTitle || ''} ${card.dataset.edPlace || ''}`).includes(query);
                if (!card.hidden) visible++;
            });
            if (empty) empty.hidden = visible !== 0;
            if (status) status.textContent = `${visible} de ${cards.length} ${section === 'places' ? 'lugares' : 'recuerdos'}`;
        }
        search?.addEventListener('input', update);
        sort?.addEventListener('change', () => {
            const direction = sort.value === 'oldest' ? 1 : -1;
            cards.sort((a, b) => direction * ((Date.parse(a.dataset.edTime) || 0) - (Date.parse(b.dataset.edTime) || 0)));
            cards.forEach(card => grid.appendChild(card));
        });
        collection.querySelector('[data-ed-reset]')?.addEventListener('click', () => {
            search.value = '';
            update();
            search.focus();
        });
        if (cards.length) update();
    }

    document.querySelectorAll('.ed-page img:not([data-ed-lightbox-image])').forEach(img => {
        let hasFallback = false;
        const showFallback = () => {
            if (hasFallback) return;
            hasFallback = true;
            img.hidden = true;
            const fallback = document.createElement('span');
            fallback.className = 'ed-photo-placeholder';
            fallback.textContent = 'Un momento para guardar';
            img.parentElement.appendChild(fallback);
        };
        img.addEventListener('error', showFallback, { once: true });
        if (img.complete && !img.naturalWidth) showFallback();
    });

    const gallery = document.querySelector('[data-ed-gallery]');
    if (gallery) {
        const prev = document.querySelector('[data-ed-gallery-prev]');
        const next = document.querySelector('[data-ed-gallery-next]');
        function updateControls() {
            prev.disabled = gallery.scrollLeft <= 2;
            next.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2;
        }
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        prev.addEventListener('click', () => gallery.scrollBy({ left: -gallery.clientWidth, behavior: reducedMotion ? 'instant' : 'smooth' }));
        next.addEventListener('click', () => gallery.scrollBy({ left: gallery.clientWidth, behavior: reducedMotion ? 'instant' : 'smooth' }));
        gallery.addEventListener('scroll', updateControls, { passive: true });
        new ResizeObserver(updateControls).observe(gallery);
        updateControls();
    }

    const lightbox = document.querySelector('[data-ed-lightbox]');
    if (lightbox) {
        const image = lightbox.querySelector('[data-ed-lightbox-image]');
        let originalOverflow;
        document.querySelectorAll('[data-ed-photo]').forEach(button => {
            button.addEventListener('click', () => {
                image.src = button.dataset.edPhoto;
                originalOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                lightbox.showModal();
            });
        });
        lightbox.querySelector('[data-ed-lightbox-close]').addEventListener('click', () => lightbox.close());
        lightbox.addEventListener('click', event => {
            if (event.target !== lightbox) return;
            const rect = lightbox.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
        });
        lightbox.addEventListener('close', () => { document.body.style.overflow = originalOverflow; });
    }
})();
