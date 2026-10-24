/* ==========================================================================
   كتاب جينكي ١ — سكربت مشترك
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'genki1:progress';
  var READ_KEY = 'genki1:hideReading';

  /* أرقام عربية-هندية */
  function arNum(v) {
    return String(v).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; });
  }

  /* ---------- التخزين ---------- */
  function loadProgress() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function saveProgress(arr) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function isDone(n) { return loadProgress().indexOf(String(n)) !== -1; }
  function setDone(n, on) {
    var cur = loadProgress().map(String);
    n = String(n);
    var i = cur.indexOf(n);
    if (on && i === -1) cur.push(n);
    if (!on && i !== -1) cur.splice(i, 1);
    saveProgress(cur);
    return cur;
  }

  /* ---------- مؤشر التقدّم ---------- */
  function paintProgress() {
    var done = loadProgress().length;
    document.querySelectorAll('[data-progress-count]').forEach(function (el) {
      el.textContent = arNum(done) + ' / ١٢';
    });
    document.querySelectorAll('[data-progress-bar]').forEach(function (el) {
      el.style.width = Math.min(100, (done / 12) * 100) + '%';
    });
    document.querySelectorAll('.lesson-card[data-lesson]').forEach(function (card) {
      card.classList.toggle('done', isDone(card.getAttribute('data-lesson')));
    });
    document.querySelectorAll('.side .lesson-link[data-lesson]').forEach(function (a) {
      a.classList.toggle('done', isDone(a.getAttribute('data-lesson')));
    });
  }

  /* ---------- زر إتمام الدرس ---------- */
  function initComplete() {
    var btn = document.querySelector('.js-complete');
    if (!btn) return;
    var n = btn.getAttribute('data-lesson');
    function paint() {
      var done = isDone(n);
      btn.classList.toggle('done', done);
      btn.querySelector('.lbl').textContent = done ? 'تم إتمام الدرس ✓' : 'علّم الدرس كمُنجَز';
    }
    paint();
    btn.addEventListener('click', function () {
      setDone(n, !isDone(n));
      paint();
      paintProgress();
      if (isDone(n) && window.GK && window.GK.toast) {
        window.GK.toast('أحسنت! تم حفظ تقدّمك في هذا المتصفح.');
      }
    });
  }

  /* ---------- إظهار/إخفاء القراءة ---------- */
  function initReading() {
    var btns = document.querySelectorAll('.js-reading');
    var hidden = localStorage.getItem(READ_KEY) === '1';
    function paint() {
      document.body.classList.toggle('hide-reading', hidden);
      btns.forEach(function (b) {
        b.classList.toggle('on', hidden);
        b.setAttribute('aria-pressed', hidden ? 'true' : 'false');
      });
    }
    paint();
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        hidden = !hidden;
        try { localStorage.setItem(READ_KEY, hidden ? '1' : '0'); } catch (e) {}
        paint();
      });
    });
  }

  /* ---------- الاختبارات ---------- */
  function initQuizzes() {
    document.querySelectorAll('.quiz').forEach(function (quiz) {
      var qs = Array.prototype.slice.call(quiz.querySelectorAll('.q'));
      var scoreEl = quiz.querySelector('[data-score]');
      var totalEl = quiz.querySelector('[data-total]');
      var answered = 0, right = 0;
      var id = quiz.getAttribute('data-quiz');
      var reset = quiz.querySelector('.js-reset');

      if (totalEl) totalEl.textContent = arNum(qs.length);
      if (scoreEl && id) {
        var best = localStorage.getItem('genki1:quiz:' + id);
        if (best) scoreEl.textContent = best;
      }

      qs.forEach(function (q) {
        var opts = Array.prototype.slice.call(q.querySelectorAll('.opt'));
        var ans = parseInt(q.getAttribute('data-answer'), 10);
        var exp = q.querySelector('.q-explain');
        opts.forEach(function (opt, i) {
          opt.addEventListener('click', function () {
            if (q.classList.contains('answered')) return;
            q.classList.add('answered');
            answered++;
            opts.forEach(function (o, j) {
              o.disabled = true;
              if (j === ans) o.classList.add('correct');
              else if (j === i) o.classList.add('wrong');
            });
            if (i === ans) {
              right++;
              if (exp) {
                var ok = exp.querySelector('.ok');
                var noHidden = exp.querySelector('.no');
                if (ok) ok.style.display = 'inline';
                if (noHidden) noHidden.style.display = 'none';
              }
            } else if (exp) {
              var no = exp.querySelector('.no');
              var okHidden = exp.querySelector('.ok');
              if (no) no.style.display = 'inline';
              if (okHidden) okHidden.style.display = 'none';
            }
            if (exp) exp.classList.add('show');
            if (scoreEl) scoreEl.textContent = arNum(right);
            if (answered === qs.length) {
              if (id) {
                var prev = parseInt(localStorage.getItem('genki1:quiz:' + id) || '0', 10);
                if (right > prev) {
                  try { localStorage.setItem('genki1:quiz:' + id, String(right)); } catch (e) {}
                  if (window.GK && window.GK.toast) window.GK.toast('أفضل نتيجة لك في هذا الاختبار: ' + arNum(right) + '/' + arNum(qs.length));
                }
              }
            }
          });
        });
      });

      if (reset) {
        reset.addEventListener('click', function () {
          answered = 0; right = 0;
          if (scoreEl) scoreEl.textContent = '٠';
          qs.forEach(function (q) {
            q.classList.remove('answered');
            var exp = q.querySelector('.q-explain');
            if (exp) exp.classList.remove('show');
            q.querySelectorAll('.opt').forEach(function (o) {
              o.disabled = false;
              o.classList.remove('correct', 'wrong');
            });
            q.querySelectorAll('.ok,.no').forEach(function (s) { s.style.display = 'none'; });
          });
          quiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }

  /* ---------- تصفية المفردات ---------- */
  function initFilters() {
    document.querySelectorAll('[data-filter]').forEach(function (input) {
      var table = document.querySelector(input.getAttribute('data-filter'));
      if (!table) return;
      var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
      var count = document.querySelector(input.getAttribute('data-count'));
      function apply() {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        rows.forEach(function (r) {
          var hit = !q || r.textContent.toLowerCase().indexOf(q) !== -1;
          r.classList.toggle('hidden', !hit);
          if (hit) shown++;
        });
        if (count) count.textContent = arNum(shown) + ' من ' + arNum(rows.length);
      }
      input.addEventListener('input', apply);
      apply();
    });
  }

  /* ---------- بحث جدول الكانجي ---------- */
  function initKanjiFilter() {
    var input = document.getElementById('kanji-search');
    var table = document.querySelector('table.kanji-table');
    if (!input || !table) return;
    var sel = document.getElementById('kanji-lesson');
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr[data-lesson]'));
    var groups = Array.prototype.slice.call(table.querySelectorAll('tbody tr.kg'));
    var count = document.getElementById('kanji-count');
    function apply() {
      var q = input.value.trim().toLowerCase();
      var lesson = sel ? sel.value : '';
      var shown = 0, visible = {};
      rows.forEach(function (r) {
        var hit = (!q || r.textContent.toLowerCase().indexOf(q) !== -1) &&
                  (!lesson || r.getAttribute('data-lesson') === lesson);
        r.classList.toggle('hidden', !hit);
        if (hit) { shown++; visible[r.getAttribute('data-lesson')] = true; }
      });
      groups.forEach(function (g) {
        g.classList.toggle('hidden', !visible[g.getAttribute('data-g')]);
      });
      if (count) count.textContent = arNum(shown) + ' من ' + arNum(rows.length) + ' كانجي';
    }
    input.addEventListener('input', apply);
    if (sel) sel.addEventListener('change', apply);
    apply();
  }

  /* ---------- تمييز أدوات القائمة ---------- */
  function initActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.side a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('active'); });
          var a = map[en.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-70px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) obs.observe(s);
    });
  }

  /* ---------- إشعار صغير ---------- */
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;inset-inline:0;bottom:26px;margin:auto;width:max-content;max-width:88%;' +
      'background:#22303a;color:#fff;font-family:Cairo,sans-serif;font-size:14px;font-weight:600;' +
      'padding:10px 18px;border-radius:999px;z-index:999;box-shadow:0 8px 22px rgba(0,0,0,.25);' +
      'opacity:0;transform:translateY(8px);transition:.25s';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'none'; });
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
      setTimeout(function () { t.remove(); }, 300);
    }, 2600);
  }

  /* ---------- بحث المسرد ---------- */
  function initGlossary() {
    var input = document.getElementById('glossary-search');
    if (!input) return;
    var rows = Array.prototype.slice.call(document.querySelectorAll('#glossary-table tr'));
    var info = document.getElementById('glossary-count');
    function apply() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (r) {
        if (!r.querySelector('td')) return;
        var hit = !q || r.textContent.toLowerCase().indexOf(q) !== -1;
        r.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      if (info) info.textContent = q ? arNum(shown) + ' نتيجة' : arNum(rows.length - 1) + ' كلمة';
    }
    input.addEventListener('input', apply);
  }

  /* ---------- الوضع الليلي ---------- */
  var THEME_KEY = 'genki1:theme';
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    document.querySelectorAll('.js-theme').forEach(function (b) {
      b.textContent = t === 'dark' ? '☀' : '☾';
      b.setAttribute('aria-label', t === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي');
      b.setAttribute('title', t === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي');
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
  }
  function initTheme() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tb-btn js-theme';
    var links = bar.querySelector('.tb-links');
    if (links) links.insertBefore(btn, links.firstChild);
    else bar.appendChild(btn);
    applyTheme(currentTheme());
    btn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      if (window.GK && window.GK.toast) {
        window.GK.toast(currentTheme() === 'dark' ? 'الوضع الليلي مفعّل' : 'الوضع النهاري مفعّل');
      }
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
        if (!saved) applyTheme(e.matches ? 'dark' : 'light');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- ظهور تدريجي عند التمرير ---------- */
  function initReveal() {
    var vh = window.innerHeight || 800;
    var i = 0;
    document.querySelectorAll('section.block, .lesson-card, .learn-pick .pick, .card').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > vh * 0.92) {          /* ما تحت الشاشة فقط: يظهر عند التمرير */
        el.classList.add('reveal', 'd' + (i % 3 + 1));
        i++;
      }
    });
    var pending = document.querySelectorAll('.reveal:not(.in)');
    if (!pending.length) return;

    var ticking = false;
    function check() {
      ticking = false;
      var h = window.innerHeight || 800;
      document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < h * 0.95) el.classList.add('in');
      });
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    check();
  }

  /* ---------- أوراق الكرز ---------- */
  function initPetals() {
    var cover = document.querySelector('.cover');
    if (!cover) return;
    var box = document.createElement('div');
    box.className = 'petals';
    box.setAttribute('aria-hidden', 'true');
    var n = 7;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var left = 8 + (i * 13) % 80;
      p.style.left = left + '%';
      p.style.animationDuration = (11 + (i % 4) * 3) + 's';
      p.style.animationDelay = (i * 1.6) + 's';
      p.style.transform = 'scale(' + (0.6 + (i % 3) * 0.22) + ')';
      box.appendChild(p);
    }
    cover.appendChild(box);
  }

  /* ---------- شريط تقدّم القراءة ---------- */
  function initReadBar() {
    var bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i>';
    document.body.appendChild(bar);
    var fill = bar.firstChild;
    function paint() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
      fill.style.width = pct + '%';
    }
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------- تشغيل ---------- */
  function boot() {
    window.GK = { toast: toast, isDone: isDone, setDone: setDone, paint: paintProgress };
    initTheme();
    initReveal();
    initPetals();
    initReadBar();
    paintProgress();
    initComplete();
    initReading();
    initQuizzes();
    initFilters();
    initKanjiFilter();
    initActiveNav();
    initGlossary();
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
