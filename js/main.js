/* ==========================================================================
   Portfolio · Ezequiel Luque
   JavaScript puro, sin dependencias.

   1. Modo claro / oscuro
   2. Menú en pantallas chicas
   3. Sombra de la cabecera al hacer scroll
   4. Link activo según la sección visible
   5. Animación de entrada (respeta prefers-reduced-motion)
   6. Lightbox de capturas (Escape, flechas, foco atrapado)
   7. Capturas que no existen -> placeholder
   8. Copiar el bloque de comandos
   9. Abrir el panel colapsable al que apunta un ancla
   10. Contador de capturas en el panel de la galería
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ========================================================================
     1. MODO CLARO / OSCURO
     Se guarda la elección en localStorage. Si no hay elección guardada,
     manda la preferencia del sistema (la resuelve el CSS).
     ====================================================================== */
  var THEME_KEY = 'portfolio-tema';
  var themeToggle = document.getElementById('theme-toggle');
  var themeIcon = document.querySelector('[data-theme-icon]');
  var themeLabel = document.querySelector('[data-theme-label]');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null; // localStorage bloqueado: seguimos con la preferencia del sistema
    }
  }

  function isDark() {
    var saved = storedTheme();
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    return systemDark.matches;
  }

  function paintToggle() {
    var dark = isDark();
    if (themeIcon) themeIcon.textContent = dark ? '☀' : '☾';
    if (themeLabel) themeLabel.textContent = dark ? 'Activar modo claro' : 'Activar modo oscuro';
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(dark));
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) { /* sin persistencia, pero el sitio funciona igual */ }
    paintToggle();
  }

  // Si ya había una elección guardada, la aplicamos al cargar
  var saved = storedTheme();
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  paintToggle();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      applyTheme(isDark() ? 'light' : 'dark');
    });
  }

  // Si el usuario nunca eligió, seguimos los cambios del sistema
  if (typeof systemDark.addEventListener === 'function') {
    systemDark.addEventListener('change', function () {
      if (!storedTheme()) paintToggle();
    });
  }

  /* ========================================================================
     2. MENÚ EN PANTALLAS CHICAS
     ====================================================================== */
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    // Al elegir una sección, se cierra
    nav.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) closeNav();
    });

    document.addEventListener('click', function (ev) {
      if (!nav.contains(ev.target) && !navToggle.contains(ev.target)) closeNav();
    });
  }

  /* ========================================================================
     3. SOMBRA DE LA CABECERA AL HACER SCROLL
     ====================================================================== */
  var header = document.getElementById('site-header');

  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ========================================================================
     4. LINK ACTIVO SEGÚN LA SECCIÓN VISIBLE
     ====================================================================== */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle(
            'is-active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ========================================================================
     5. ANIMACIÓN DE ENTRADA
     Con prefers-reduced-motion todo queda visible de entrada (lo resuelve
     también el CSS); acá simplemente no observamos nada.
     ====================================================================== */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ========================================================================
     6. LIGHTBOX DE CAPTURAS
     Se abre con clic o Enter sobre la captura, se cierra con Escape, con el
     botón o con clic en el fondo, y se navega con las flechas del teclado.
     ====================================================================== */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCaption = document.getElementById('lightbox-caption');
  var lbCounter = document.getElementById('lightbox-counter');
  var lbClose = lightbox && lightbox.querySelector('[data-lb-close]');
  var lbPrev = lightbox && lightbox.querySelector('[data-lb-prev]');
  var lbNext = lightbox && lightbox.querySelector('[data-lb-next]');

  var lbItems = [];      // capturas de la galería abierta
  var lbIndex = 0;
  var lastFocused = null;

  function lbShow(index) {
    if (!lbItems.length) return;
    lbIndex = (index + lbItems.length) % lbItems.length;

    var img = lbItems[lbIndex];
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;

    var figure = img.closest('.shot');
    var caption = figure && figure.querySelector('.shot__cap');
    lbCaption.textContent = caption ? caption.textContent.trim() : img.alt;
    lbCounter.textContent = (lbIndex + 1) + ' / ' + lbItems.length;

    // Con una sola captura no tiene sentido mostrar las flechas
    var solo = lbItems.length < 2;
    lbPrev.hidden = solo;
    lbNext.hidden = solo;
  }

  function lbOpen(button) {
    var gallery = button.closest('.gallery');
    if (!gallery) return;

    lbItems = Array.prototype.slice.call(gallery.querySelectorAll('.shot__btn img'));
    var current = button.querySelector('img');
    lastFocused = button;

    lightbox.hidden = false;
    document.body.classList.add('is-locked');
    lbShow(lbItems.indexOf(current));
    lbClose.focus();
  }

  function lbCloseIt() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lbImg.src = '';
    lbImg.alt = '';
    document.body.classList.remove('is-locked');
    if (lastFocused) lastFocused.focus();
  }

  if (lightbox) {
    // Abrir desde cualquier captura (los placeholders no son botones)
    document.addEventListener('click', function (ev) {
      var button = ev.target.closest('[data-shot]');
      if (button) lbOpen(button);
    });

    lbClose.addEventListener('click', lbCloseIt);
    lbPrev.addEventListener('click', function () { lbShow(lbIndex - 1); });
    lbNext.addEventListener('click', function () { lbShow(lbIndex + 1); });

    // Clic en el fondo (no sobre la imagen ni los botones)
    lightbox.addEventListener('click', function (ev) {
      if (ev.target === lightbox || ev.target.classList.contains('lightbox__stage')) {
        lbCloseIt();
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (lightbox.hidden) {
        // Escape también cierra el menú de pantallas chicas
        if (ev.key === 'Escape') closeNav();
        return;
      }

      if (ev.key === 'Escape') {
        ev.preventDefault();
        lbCloseIt();
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        lbShow(lbIndex - 1);
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        lbShow(lbIndex + 1);
      } else if (ev.key === 'Tab') {
        // El foco se queda dentro del diálogo mientras está abierto
        var focusables = Array.prototype.slice
          .call(lightbox.querySelectorAll('button'))
          .filter(function (el) { return !el.hidden; });
        if (!focusables.length) return;

        var first = focusables[0];
        var last = focusables[focusables.length - 1];

        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ========================================================================
     7. CAPTURAS QUE TODAVÍA NO EXISTEN
     Si un archivo de assets/ falta, en lugar del ícono de imagen rota se
     muestra un placeholder con el nombre del archivo esperado.
     ====================================================================== */
  function toPlaceholder(img) {
    var figure = img.closest('.shot');
    var button = img.closest('.shot__btn');
    if (!figure || !button) return;

    var file = img.getAttribute('src');

    var ph = document.createElement('div');
    ph.className = 'shot__ph';

    var tag = document.createElement('span');
    tag.className = 'shot__ph-tag';
    tag.textContent = 'Captura pendiente';

    var name = document.createElement('code');
    name.className = 'shot__ph-file';
    name.textContent = file;

    ph.appendChild(tag);
    ph.appendChild(name);

    figure.classList.add('shot--pending');
    button.replaceWith(ph);
  }

  Array.prototype.slice.call(document.querySelectorAll('.shot__btn img'))
    .forEach(function (img) {
      img.addEventListener('error', function () { toPlaceholder(img); });
      // Por si la imagen ya falló antes de que corriera este script
      if (img.complete && img.naturalWidth === 0) toPlaceholder(img);
    });

  /* ========================================================================
     8. COPIAR EL BLOQUE DE COMANDOS
     ====================================================================== */
  Array.prototype.slice.call(document.querySelectorAll('[data-copy]'))
    .forEach(function (button) {
      button.addEventListener('click', function () {
        var block = button.closest('.code-block');
        var code = block && block.querySelector('code');
        if (!code || !navigator.clipboard) return;

        navigator.clipboard.writeText(code.textContent).then(function () {
          var original = button.textContent;
          button.textContent = 'Copiado';
          setTimeout(function () { button.textContent = original; }, 1600);
        });
      });
    });

  /* ========================================================================
     9. ABRIR EL PANEL COLAPSABLE AL QUE APUNTA UN ANCLA
     Por ejemplo, el botón "Cómo probarlo en local" de RotiOS: además de
     llevar hasta el panel, lo abre.
     ====================================================================== */
  function openPanelFromHash(hash) {
    if (!hash || hash.length < 2) return;

    var target;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return; // hash que no es un selector válido
    }
    if (!target) return;

    var panel = target.tagName === 'DETAILS' ? target : target.closest('details');
    if (panel) panel.open = true;
  }

  document.addEventListener('click', function (ev) {
    var link = ev.target.closest('a[href^="#"]');
    if (link) openPanelFromHash(link.getAttribute('href'));
  });

  window.addEventListener('hashchange', function () {
    openPanelFromHash(location.hash);
  });

  // Por si alguien entra directo con el ancla en la URL
  openPanelFromHash(location.hash);

  /* ========================================================================
     10. CONTADOR DE CAPTURAS EN EL PANEL DE LA GALERÍA
     Se cuenta en el momento, así que si más adelante descomentás una captura
     el número se actualiza solo.
     ====================================================================== */
  Array.prototype.slice.call(document.querySelectorAll('[data-shot-count]'))
    .forEach(function (badge) {
      var panel = badge.closest('details');
      var gallery = panel && panel.querySelector('.gallery');
      if (!gallery) return;

      var total = gallery.querySelectorAll('.shot__btn img').length;
      badge.textContent = total === 1 ? '1 imagen' : total + ' imágenes';
    });

})();
