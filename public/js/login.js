(function () {
    'use strict';
    const root = document.querySelector('.night-login');
    if (!root) return;
    const password = document.getElementById('password');
    const toggle = document.getElementById('passwordToggle');
    const greeting = document.getElementById('nightGreeting');
    toggle.addEventListener('click', function () {
        const show = password.type === 'password';
        password.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        toggle.setAttribute('aria-pressed', String(show));
        const icon = toggle.querySelector('i');
        icon.classList.toggle('fa-eye', !show);
        icon.classList.toggle('fa-eye-slash', show);
    });
    root.querySelectorAll('input[name="username"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (!radio.checked) return;
            const name = radio.value === 'deli' ? 'Deli' : 'Emi';
            root.dataset.profile = radio.value === 'deli' ? 'deli' : 'emi';
            greeting.textContent = 'Qué bueno que estés acá, ' + name + '.';
        });
    });

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.getElementById('nightSky');
    const context = canvas.getContext('2d');
    if (!context) return;
    const universe = root.querySelector('.night-universe');
    const orbitScene = universe.querySelector('svg');
    let width = 0;
    let height = 0;
    let stars = [];
    let frame = null;
    let lastPaint = 0;
    let shootingStar = null;
    let nextShootingStar = performance.now() + 4500;

    function resize() {
        const rect = root.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        const count = Math.min(95, Math.round(width * height / 14000));
        stars = Array.from({ length: count }, function () {
            return { x: Math.random() * width, y: Math.random() * height, radius: .35 + Math.random() * .9, phase: Math.random() * Math.PI * 2, speed: .4 + Math.random() * .6 };
        });
        paint(performance.now());
    }

    function paint(time) {
        context.clearRect(0, 0, width, height);
        for (const star of stars) {
            const pulse = motion.matches ? .65 : .4 + .3 * Math.sin(time / 1400 * star.speed + star.phase);
            context.beginPath();
            context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(244, 209, 228, ' + pulse + ')';
            context.fill();
        }
        if (motion.matches) return;
        if (!shootingStar && time > nextShootingStar) {
            shootingStar = { start: time, x: width * (.15 + Math.random() * .45), y: height * (.06 + Math.random() * .2) };
            nextShootingStar = time + 9000 + Math.random() * 7000;
        }
        if (shootingStar) {
            const progress = (time - shootingStar.start) / 1250;
            if (progress >= 1) { shootingStar = null; return; }
            const x = shootingStar.x + progress * 150;
            const y = shootingStar.y + progress * 75;
            const alpha = Math.sin(progress * Math.PI) * .65;
            const gradient = context.createLinearGradient(x - 70, y - 35, x, y);
            gradient.addColorStop(0, 'rgba(244, 195, 222, 0)');
            gradient.addColorStop(1, 'rgba(244, 195, 222, ' + alpha + ')');
            context.strokeStyle = gradient;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(x - 70, y - 35);
            context.lineTo(x, y);
            context.stroke();
        }
    }
    function tick(time) {
        if (time - lastPaint >= 33) { paint(time); lastPaint = time; }
        frame = requestAnimationFrame(tick);
    }
    function updateMotion() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        if (motion.matches || document.hidden) {
            orbitScene.pauseAnimations();
            if (motion.matches) orbitScene.setCurrentTime(0);
            paint(performance.now());
            return;
        }
        orbitScene.unpauseAnimations();
        frame = requestAnimationFrame(tick);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    document.addEventListener('visibilitychange', updateMotion);
    motion.addEventListener('change', updateMotion);
    root.addEventListener('pointermove', function (event) {
        if (motion.matches || event.pointerType !== 'mouse') return;
        const rect = root.getBoundingClientRect();
        universe.style.setProperty('--orbit-x', ((event.clientX - rect.left) / rect.width - .5) * 12 + 'px');
        universe.style.setProperty('--orbit-y', ((event.clientY - rect.top) / rect.height - .5) * 8 + 'px');
    });
    root.addEventListener('pointerleave', function () {
        universe.style.setProperty('--orbit-x', '0px');
        universe.style.setProperty('--orbit-y', '0px');
    });
    window.addEventListener('pagehide', function () { observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame); });
    window.addEventListener('pageshow', function (event) { if (event.persisted) { observer.observe(root); updateMotion(); } });
    resize();
    updateMotion();
})();
