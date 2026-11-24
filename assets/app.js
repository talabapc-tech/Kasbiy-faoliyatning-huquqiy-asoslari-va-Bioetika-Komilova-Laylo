/* Kasbiy faoliyatning huquqiy asoslari va Bioetika RTR — iOS uslubidagi SPA (oflayn ishlaydi) */
(function () {
  'use strict';
  var P = window.HUQ, B = P.blocks;
  var view = document.getElementById('view');
  var nav = document.getElementById('nav');
  var navBack = document.getElementById('navBack');
  var navTitle = document.getElementById('navTitle');
  var navRight = document.getElementById('navRight');

  /* ---------- Yordamchilar ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function ic(id, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + '><use href="#i-' + id + '"/></svg>'; }
  var LS = 'huq1:';
  function get(k, d) { try { var v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function uniq(a) { var s = {}; return a.filter(function (x) { return s[x] ? false : (s[x] = 1); }); }
  function posterSrc(f) { return 'assets/plakatlar/' + f + '.jpg'; }

  /* ---------- Holat ---------- */
  var dir = get('dir', 'd');
  if (!P.directions[dir]) dir = 'd';
  function D() { return P.directions[dir]; }
  function topics() {
    return D().topics.map(function (t, i) {
      var c = t[2], first = B[c[0]];
      var posters = [];
      c.forEach(function (id) { (B[id].posters || []).forEach(function (p) { if (!posters.some(function (q) { return q[0] === p[0]; })) posters.push(p); }); });
      return { n: i + 1, title: t[0], type: t[1] === 'A' ? 'Amaliy' : 'Nazariy', blocks: c, color: first.color, short: c.map(function (id) { return B[id].short; }).join(' · '), posters: posters };
    });
  }
  function isRead(t) { var r = get('read', {}); return t.blocks.every(function (id) { return r[id]; }); }
  function setRead(t, v) { var r = get('read', {}); t.blocks.forEach(function (id) { if (v) r[id] = 1; else delete r[id]; }); put('read', r); }
  function scoreKey(t) { return dir + ':' + t.blocks.join('+'); }
  function getScore(t) { return get('score', {})[scoreKey(t)]; }
  function setScore(t, p) { var s = get('score', {}); var k = scoreKey(t); if (s[k] == null || p > s[k]) s[k] = p; put('score', s); }

  /* ---------- Mavzu fayllarini yuklash (file:// da ham ishlaydi) ---------- */
  var loading = {};
  function loadBlock(id) {
    window.HUQ_T = window.HUQ_T || {};
    if (window.HUQ_T[id]) return Promise.resolve(window.HUQ_T[id]);
    if (loading[id]) return loading[id];
    loading[id] = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = 'assets/topics/' + id + '.js?v=1';
      s.onload = function () { res(window.HUQ_T[id] || null); };
      s.onerror = function () { delete loading[id]; res(null); };
      document.head.appendChild(s);
    });
    return loading[id];
  }
  function loadMany(ids) { return Promise.all(ids.map(loadBlock)); }

  /* ---------- Faqat kunduzgi (yorqin kumush) rejim ---------- */
  document.documentElement.setAttribute('data-theme', 'light');

  /* ---------- Navigatsiya ---------- */
  function setNav(o) {
    o = o || {};
    navBack.hidden = !o.back;
    if (o.back) { navBack.href = o.back; $('span', navBack).textContent = o.backLabel || 'Orqaga'; }
    navTitle.textContent = o.title || '';
    navRight.innerHTML = o.right || '';
  }
  function onScroll() { nav.classList.toggle('solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  function setTab(name) { $$('.tabbar a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === name); }); }

  var lastDepth = 0;
  function route() {
    var h = (location.hash || '#/').slice(2).split('/');
    var depth = h[0] === 't' || h[0] === 'final' ? 1 : 0;
    view.classList.remove('anim', 'anim-back');
    void view.offsetWidth;
    if (depth !== lastDepth) view.classList.add(depth > lastDepth ? 'anim' : 'anim-back');
    lastDepth = depth;
    window.scrollTo(0, 0);
    closeViewer();
    if (h[0] === 't') return renderTopic(+h[1], h[2] || 'lec');
    if (h[0] === 'tests') return renderTests();
    if (h[0] === 'final') return renderFinal();
    if (h[0] === 'glossary') return renderGlossary();
    if (h[0] === 'profile') return renderProfile();
    renderHome();
  }
  window.addEventListener('hashchange', route);

  /* ======================================================
     BOSH SAHIFA
     ====================================================== */
  function dirSeg(cls) {
    return '<div class="seg ' + (cls || '') + '" role="group" aria-label="Yoʻnalish">' + Object.keys(P.directions).map(function (k) {
      return '<button data-dir="' + k + '" aria-pressed="' + (k === dir) + '">' + esc(P.directions[k].name) + '</button>';
    }).join('') + '</div>';
  }
  function bindDirSeg(el, rerender) {
    $$('[data-dir]', el).forEach(function (b) {
      b.onclick = function () { dir = b.getAttribute('data-dir'); put('dir', dir); rerender(); };
    });
  }

  function renderHome() {
    setTab('home'); setNav({ title: 'Mavzular' });
    var M = P.module, d = D(), ts = topics();
    var readN = ts.filter(isRead).length;
    var next = ts.filter(function (t) { return !isRead(t); })[0];
    var pct = Math.round(readN / ts.length * 100);
    var html = '';
    html += '<div class="eyebrow">' + esc(M.year) + '</div><div class="large-title">Mavzular</div>';
    html += '<div class="hero" id="hero" role="button" tabindex="0"><small>Raqamli taʼlim resursi</small><h1>' + esc(M.title) + '</h1>' +
      '<p>' + esc(M.author) + ' · ' + esc(M.org) + '</p>' +
      '<div class="chips"><span class="chip">' + esc(d.code) + ' – ' + esc(d.name) + '</span><span class="chip">' + esc(M.semester) + '</span><span class="chip">' + d.hours.jami + ' soat</span></div></div>';
    html += dirSeg('big');
    html += '<div class="stats" style="margin-top:12px">' +
      stat(d.hours.jami, 'Jami soat', '') + stat(d.hours.nazariy, 'Nazariy', 'c-blue') + stat(d.hours.amaliy, 'Amaliy', 'c-orange') + stat(d.hours.mustaqil, 'Mustaqil ish', 'c-green') + '</div>';
    html += '<div class="section-h">Oʻzlashtirish</div><div class="group"><a class="row" style="--inset:16px" href="#/t/' + (next ? next.n : 1) + '">' +
      '<div class="ring sm c-green" style="--p:' + pct + '"><b>' + pct + '%</b></div>' +
      '<div class="grow"><div class="t"><b>' + readN + ' / ' + ts.length + '</b> mavzu oʻrganildi</div><div class="s">' + (next ? 'Davom ettirish: ' + next.n + '-mavzu' : 'Barcha mavzular oʻrganildi ✓') + '</div></div>' + ic('chev', 'chev') + '</a></div>';
    html += '<div class="section-h">' + esc(d.name) + ' (' + esc(d.groups) + ') · ' + ts.length + ' mavzu</div><div class="group">' + ts.map(topicRow).join('') + '</div>';
    html += '<div class="footer">' + esc(M.author) + ' · ' + esc(M.org) + '<br>' + esc(M.region) + ', ' + esc(M.year) + '</div>';
    view.innerHTML = html;
    bindDirSeg(view, renderHome);
    var hero = $('#hero');
    hero.onclick = aboutSheet;
    hero.onkeydown = function (e) { if (e.key === 'Enter') aboutSheet(); };
  }
  function stat(v, l, c) { return '<div class="stat ' + c + '"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function topicRow(t) {
    var done = isRead(t);
    return '<a class="row c-' + t.color + '" href="#/t/' + t.n + '">' +
      '<div class="ic">' + t.n + '</div>' +
      '<div class="grow"><div class="t">' + esc(t.title) + '</div><div class="s"><span class="tag ' + t.type.toLowerCase() + '">' + t.type + '</span>2 soat' + (t.posters.length ? ' · ' + t.posters.length + ' plakat' : '') + '</div></div>' +
      (done ? '<span class="done-dot">' + ic('check') + '</span>' : ic('chev', 'chev')) + '</a>';
  }

  function aboutSheet() {
    var M = P.module;
    openSheet('<div class="large-title" style="font-size:26px;margin-top:4px">Resurs haqida</div>' +
      '<div class="group">' +
      kv('Fan', M.title) + kv('Muallif', M.author) + kv('Muassasa', M.org) + kv('Hudud', M.region) + kv('Oʻquv yili', M.year) +
      kv('Yoʻnalishlar', Object.keys(P.directions).map(function (k) { return P.directions[k].code + ' – ' + P.directions[k].name; }).join('; ')) + '</div>' +
      '<p class="section-f">Resurs internetsiz ishlaydi: papkani kompyuter yoki telefonga koʻchirib, index.html faylini brauzerda oching. Natijalar shu qurilmada saqlanadi.</p>' +
      '<div class="btn-row"><button class="btn gray" data-close>Yopish</button></div>');
  }
  function kv(k, v) { return '<div class="row" style="--inset:16px;cursor:default"><div class="grow"><div class="s" style="margin:0 0 2px">' + esc(k) + '</div><div class="t">' + esc(v) + '</div></div></div>'; }

  /* ======================================================
     MAVZU SAHIFASI
     ====================================================== */
  var TABS = [['lec', 'Maʼruza'], ['pos', 'Plakat'], ['test', 'Test'], ['glo', 'Lugʻat'], ['rev', 'Savol'], ['prac', 'Mashq']];

  function renderTopic(n, tab) {
    var ts = topics(), t = ts[n - 1];
    if (!t) { location.hash = '#/'; return; }
    setTab('home');
    setNav({ back: '#/', backLabel: 'Mavzular', title: n + '-mavzu' });
    var hasPrac = t.blocks.some(function (id) { return (B[id].interactive || []).length; });
    view.innerHTML = '<div class="c-' + t.color + '">' +
      '<div class="title-block"><div class="code">' + n + '-mavzu · <span class="tag ' + t.type.toLowerCase() + '">' + t.type + '</span> · 2 soat</div><h1>' + esc(t.title) + '</h1></div>' +
      '<div class="seg-sticky"><div class="seg" id="tseg"></div></div>' +
      '<div id="tabc"><div class="spinner"></div></div>' +
      '<div class="section-h">Boshqa mavzular</div><div class="group">' +
      (n > 1 ? pagerRow(ts[n - 2], 'Oldingi') : '') + (n < ts.length ? pagerRow(ts[n], 'Keyingi') : '') + '</div></div>';

    loadMany(t.blocks).then(function (ds) {
      ds = ds.filter(Boolean);
      var hasCases = ds.some(function (x) { return x.cases && x.cases.length; });
      var tabs = TABS.filter(function (x) { return x[0] !== 'prac' || hasPrac || hasCases; });
      if (!tabs.some(function (x) { return x[0] === tab; })) tab = 'lec';
      var seg = $('#tseg');
      seg.innerHTML = tabs.map(function (x) { return '<button data-tab="' + x[0] + '" aria-pressed="' + (x[0] === tab) + '">' + x[1] + '</button>'; }).join('');
      function show(name) {
        tab = name;
        $$('button', seg).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tab') === name); });
        history.replaceState(null, '', '#/t/' + n + '/' + name);
        var el = $('#tabc');
        if (!ds.length) { el.innerHTML = '<div class="empty">Mavzu materiallari hali yuklanmagan.</div>'; return; }
        ({ lec: tabLecture, pos: tabPosters, test: tabTest, glo: tabGlossary, rev: tabReview, prac: tabPractice })[name](el, t, ds);
        var top = $('.seg-sticky').offsetTop - 44;
        if (window.scrollY > top) window.scrollTo(0, top);
      }
      $$('button', seg).forEach(function (b) { b.onclick = function () { show(b.getAttribute('data-tab')); }; });
      show(tab);
    });
  }
  function pagerRow(t, label) {
    return '<a class="row c-' + t.color + '" href="#/t/' + t.n + '"><div class="ic">' + t.n + '</div><div class="grow"><div class="s" style="margin:0">' + label + '</div><div class="t">' + esc(t.title) + '</div></div>' + ic('chev', 'chev') + '</a>';
  }
  function blockHead(ds, i, t) {
    return ds.length > 1 ? '<div class="block-sep">' + (i + 1) + '-qism · ' + esc(B[t.blocks[i]].short) + '</div>' : '';
  }

  /* ---- Ma'ruza ---- */
  function tabLecture(el, t, ds) {
    var html = '';
    ds.forEach(function (d, i) {
      html += blockHead(ds, i, t);
      html += '<div class="card"><h3>' + ic('spark') + 'Mashgʻulot maqsadi</h3><p>' + esc(d.goal) + '</p></div>';
      if (d.plan && d.plan.length) html += '<div class="card"><h3>' + ic('book') + 'Maʼruza rejasi</h3><ol>' + d.plan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>';
      if (d.know && d.know.length) html += '<div class="card"><h3>' + ic('check') + 'Oʻquvchi bilishi kerak</h3><ul>' + d.know.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
      if (d.keywords && d.keywords.length) html += '<div class="section-h" style="margin-top:14px">Kalit soʻzlar</div><div class="chips" style="margin:0 4px 16px">' + d.keywords.map(function (k) { return '<span class="chip">' + esc(k) + '</span>'; }).join('') + '</div>';
      (d.lecture || []).forEach(function (s) { html += '<article class="lec"><h2>' + esc(s.h) + '</h2>' + s.html + '</article>'; });
      if (d.selfwork) html += '<div class="card c-s1"><h3>' + ic('doc') + 'Mustaqil ish</h3><p>' + esc(d.selfwork) + '</p></div>';
    });
    var done = isRead(t);
    html += '<div class="btn-row actions-bar"><button class="btn ' + (done ? 'gray' : 'green') + '" id="readBtn">' + (done ? '✓ Oʻrganilgan (bekor qilish)' : 'Oʻqib chiqdim ✓') + '</button>' +
      '<button class="btn tinted" id="toTest">Bilimni sinash: test →</button></div>';
    el.innerHTML = html;
    $('#readBtn').onclick = function () { setRead(t, !isRead(t)); tabLecture(el, t, ds); };
    $('#toTest').onclick = function () { $('#tseg [data-tab="test"]').click(); };
  }

  /* ---- Plakatlar ---- */
  function tabPosters(el, t) {
    if (!t.posters.length) {
      el.innerHTML = '<div class="card"><h3>' + ic('img') + 'Plakat</h3><p class="muted">Bu mavzu uchun alohida plakat yoʻq.</p></div>';
      return;
    }
    el.innerHTML = '<div class="posters">' + t.posters.map(function (p, i) {
      return '<button class="poster" data-i="' + i + '"><img loading="lazy" src="' + posterSrc(p[0]) + '" alt="' + esc(p[1]) + '"><div>' + esc(p[1]) + '<small>Infografika-plakat · kattalashtirish uchun bosing</small></div></button>';
    }).join('') + '</div><p class="section-f">Plakatlar — koʻrgazmali oʻquv materiallari. Darsda proyektor orqali koʻrsatish yoki chop etish mumkin.</p>';
    $$('.poster', el).forEach(function (b) { b.onclick = function () { var p = t.posters[+b.getAttribute('data-i')]; openViewer(posterSrc(p[0]), p[1]); }; });
  }

  /* ---- Test ---- */
  function prepQs(list, limit) {
    var qs = shuffle(list).slice(0, limit || list.length);
    return qs.map(function (q) {
      var order = shuffle(q.o.map(function (_, i) { return i; }));
      return { q: q.q, o: order.map(function (i) { return q.o[i]; }), a: order.indexOf(q.a) };
    });
  }
  function tabTest(el, t, ds) {
    var all = [];
    ds.forEach(function (d) { all = all.concat(d.tests || []); });
    if (!all.length) { el.innerHTML = '<div class="empty">Test savollari yoʻq.</div>'; return; }
    var best = getScore(t);
    el.innerHTML = '<div class="card" style="text-align:center"><h3 style="justify-content:center">' + ic('check') + 'Mavzu boʻyicha test</h3><p class="muted">' + all.length + ' ta savol · javob variantlari har safar aralashtiriladi</p>' +
      (best != null ? '<p>Eng yaxshi natija: <b>' + best + '%</b></p>' : '') + '<div class="btn-row"><button class="btn" id="startQ">Testni boshlash</button></div></div>';
    $('#startQ').onclick = function () {
      runQuiz(el, function () { return prepQs(all); }, function (p) { setScore(t, p); });
    };
  }
  function grade(p) { return p >= 86 ? ['Aʼlo!', 'green'] : p >= 71 ? ['Yaxshi', 'blue'] : p >= 56 ? ['Qoniqarli', 'orange'] : ['Mavzuni yana takrorlang', 'red']; }
  function runQuiz(el, make, onDone) {
    var qs = make(), i = 0, right = 0, wrong = [];
    function show() {
      if (i >= qs.length) return finish();
      var q = qs[i];
      el.innerHTML = '<div class="q-meta"><span>Savol ' + (i + 1) + ' / ' + qs.length + '</span><span>Toʻgʻri: ' + right + '</span></div>' +
        '<div class="q-progress"><i style="width:' + (i / qs.length * 100) + '%"></i></div>' +
        '<div class="q-text">' + esc(q.q) + '</div><div class="group">' +
        q.o.map(function (o, k) { return '<button class="opt" data-k="' + k + '"><span class="let">' + 'ABCD'[k] + '</span><span>' + esc(o) + '</span></button>'; }).join('') +
        '</div><div id="qnext"></div>';
      $$('.opt', el).forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute('data-k');
          if (k === q.a) right++; else wrong.push(q);
          $$('.opt', el).forEach(function (x) {
            x.disabled = true; var kk = +x.getAttribute('data-k');
            if (kk === q.a) x.classList.add('ok'); else if (kk === k) x.classList.add('bad');
          });
          $('#qnext', el).innerHTML = '<div class="btn-row"><button class="btn">' + (i + 1 < qs.length ? 'Keyingi savol' : 'Natijani koʻrish') + '</button></div>';
          $('#qnext .btn', el).onclick = function () { i++; show(); };
        };
      });
    }
    function finish() {
      var p = Math.round(right / qs.length * 100), g = grade(p);
      if (onDone) onDone(p);
      el.innerHTML = '<div class="card result c-' + g[1] + '"><div class="ring" style="--p:' + p + '"><b>' + p + '%</b></div><h2>' + g[0] + '</h2><p>' + right + ' / ' + qs.length + ' ta toʻgʻri javob</p>' +
        '<div class="btn-row"><button class="btn" id="again">Qayta topshirish</button></div></div>' +
        (wrong.length ? '<div class="section-h">Xatolar ustida ishlash</div><div class="group">' + wrong.map(function (q) {
          return '<div class="row" style="--inset:16px;cursor:default"><div class="grow"><div class="t">' + esc(q.q) + '</div><div class="s"><b>✓ ' + esc(q.o[q.a]) + '</b></div></div></div>';
        }).join('') + '</div>' : '');
      $('#again', el).onclick = function () { runQuiz(el, make, onDone); };
    }
    show();
  }

  /* ---- Lug'at (mavzu) ---- */
  function mergeGloss(ds) {
    var seen = {}, out = [];
    ds.forEach(function (d) { (d.glossary || []).forEach(function (g) { var k = g.t.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(g); } }); });
    return out.sort(uzCmp);
  }
  function uzNorm(s) { return String(s || '').toLowerCase().replace(/[‘ʻ’`']/g, "'"); }
  function uzCmp(a, b) { var x = uzNorm(a.t), y = uzNorm(b.t); return x < y ? -1 : x > y ? 1 : 0; }
  function termRow(g) { return '<div class="row term" style="--inset:16px;cursor:default"><div class="grow"><b>' + esc(g.t) + '</b><span>' + esc(g.d) + '</span>' + (g.src ? '<small class="src">' + esc(g.src) + '</small>' : '') + '</div></div>'; }
  function tabGlossary(el, t, ds) {
    var gl = mergeGloss(ds);
    el.innerHTML = '<div class="btn-row" style="margin:0 0 14px"><button class="btn tinted sm" id="fc">' + ic('flip') + 'Kartochkalar rejimi</button></div><div class="group">' + gl.map(termRow).join('') + '</div>';
    $('#fc').onclick = function () { flashcards(el, gl, function () { tabGlossary(el, t, ds); }); };
  }
  function flashcards(el, list, back) {
    var arr = shuffle(list), i = 0;
    function show() {
      var g = arr[i];
      el.innerHTML = '<div class="q-meta"><span>Kartochka ' + (i + 1) + ' / ' + arr.length + '</span><span>Agʻdarish uchun bosing</span></div>' +
        '<div class="flash" id="fl"><div class="flash-in"><div class="flash-face front">' + esc(g.t) + '<small>Taʼrifini eslang…</small></div><div class="flash-face back">' + esc(g.d) + '</div></div></div>' +
        '<div class="btn-row actions-bar"><button class="btn gray" id="pv"' + (i ? '' : ' disabled') + '>← Oldingi</button><button class="btn" id="nx">' + (i + 1 < arr.length ? 'Keyingi →' : 'Tugatish') + '</button><button class="btn tinted" id="ex">Roʻyxatga qaytish</button></div>';
      $('#fl', el).onclick = function () { this.classList.toggle('flipped'); };
      $('#pv', el).onclick = function () { i--; show(); };
      $('#nx', el).onclick = function () { if (i + 1 < arr.length) { i++; show(); } else back(); };
      $('#ex', el).onclick = back;
    }
    show();
  }

  /* ---- Savollar ---- */
  function tabReview(el, t, ds) {
    var html = '';
    ds.forEach(function (d, i) {
      html += blockHead(ds, i, t);
      html += '<div class="section-h">Nazorat savollari</div><div class="group">' + (d.review || []).map(function (q, k) {
        return '<div class="row" style="--inset:60px;cursor:default"><div class="ic" style="background:var(--fill);color:var(--label2)">' + (k + 1) + '</div><div class="grow"><div class="t">' + esc(q) + '</div></div></div>';
      }).join('') + '</div>';
      if (d.selfwork) html += '<div class="section-h">Mustaqil ish topshirigʻi</div><div class="card">' + esc(d.selfwork) + '</div>';
    });
    el.innerHTML = html;
  }

  /* ---- Mashq: 4 ta huquq/bioetika interaktivi va vaziyatli masalalar ---- */
  function tabPractice(el, t, ds) {
    el.innerHTML = '';
    var shownW = {};
    t.blocks.forEach(function (id, i) {
      var d = ds[i] || {};
      (B[id].interactive || []).forEach(function (w) {
        if (shownW[w]) return;
        shownW[w] = 1;
        var box = document.createElement('div'); el.appendChild(box);
        WIDGETS[w](box);
      });
      if (d.cases && d.cases.length) {
        var box = document.createElement('div'); el.appendChild(box);
        casesWidget(box, d.cases);
      }
    });
    if (!el.innerHTML) el.innerHTML = '<div class="empty">Bu mavzuda mashq yoʻq.</div>';
  }

  function casesWidget(el, cases) {
    var html = '<div class="h2">Vaziyatli masalalar (Case-study)</div><p class="section-f" style="margin:-4px 4px 12px">Huquqiy yoki bioetik vaziyatni oʻqing va qonunchilikka eng mos qarorni tanlang.</p>';
    html += cases.map(function (c, ci) {
      return '<div class="card" data-c="' + ci + '"><h3>' + ic('scale') + esc(c.title) + '</h3><p>' + esc(c.situation) + '</p><p><b>' + esc(c.question) + '</b></p>' +
        c.options.map(function (o, k) { return '<button class="case-opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '<div class="ex"></div></div>';
    }).join('');
    el.innerHTML = html;
    $$('[data-c]', el).forEach(function (card) {
      var c = cases[+card.getAttribute('data-c')];
      $$('.case-opt', card).forEach(function (b) {
        b.onclick = function () {
          if (card.classList.contains('answered')) return;
          card.classList.add('answered');
          var k = +b.getAttribute('data-k');
          $$('.case-opt', card).forEach(function (x) { var kk = +x.getAttribute('data-k'); if (kk === c.best) x.classList.add('ok'); else if (kk === k) x.classList.add('bad'); });
          $('.ex', card).innerHTML = '<div class="explain"><b>' + (k === c.best ? '✓ Toʻgʻri qaror. ' : 'Toʻgʻri javob belgilandi. ') + '</b>' + esc(c.explain) + '</div>';
        };
      });
    });
  }

  /* ---------- 1. Bioetikaning 4 tamoyili (Bochamp–Childress) ---------- */
  var BIO_P = [
    ['1', 'Avtonomiya (Autonomy)', 'Bemorning erkin tanlov huquqi', 'Bemor oʻz sogʻligʻi, tashxisi va davolash usullari haqida toʻliq maʼlumot olish hamda erkin, ongli rozilik berish yoki muolajadan voz kechish huquqiga ega.', 'Har qanday tibbiy aralashuvdan oldin yozma xabardor rozilik (informed consent) olinadi.', 's1'],
    ['2', 'Zarar yetkazmaslik (Non-maleficence)', 'Primum non nocere — avvalo zarar yetkazma', 'Tibbiyot xodimi bemorga jismoniy, ruhiy yoki axloqiy zarar yetkazadigan harakatlardan tiyilishi, xavfsizlik va antiseptika qoidalariga qatʼiy amal qilishi shart.', 'Dori dozasini va allergik anamnezni ikki marta tekshirish — ushbu tamoyilning amaliy ifodasi.', 's2'],
    ['3', 'Foyda keltirish (Beneficence)', 'Bemor manfaati yoʻlida faol harakat', 'Shifokor, farmatsevt va hamshira nafaqat zarardan saqlanishi, balki bemorning ahvolini yaxshilash, ogʻriqni kamaytirish va hayot sifatini oshirish uchun faol choralar koʻrishi kerak.', 'Profilaktik emlash, bemorga toʻgʻri parvarish va dori qoʻllash tartibini tushuntirish.', 's3'],
    ['4', 'Adolat (Justice)', 'Tibbiy yordamdan teng foydalanish', 'Barcha bemorlarga millati, jinsi, yoshi, ijtimoiy mavqei yoki moddiy ahvolidan qatʼi nazar teng va sifatli tibbiy yordam koʻrsatilishi lozim.', 'Shoshilinch yordam navbati tanish-bilishlikka emas, balki klinik ogʻirlik darajasiga (triaj) koʻra belgilanadi.', 's4']
  ];
  function bioethicsWidget(el) {
    el.innerHTML = '<div class="h2">Bioetikaning 4 asosiy tamoyili (Bochamp–Childress)</div>' +
      '<p class="section-f" style="margin:-4px 4px 12px">Har bir tamoyilni bosib, mazmuni va tibbiy amaliyotdagi qoʻllanilishini koʻring.</p>' +
      '<div class="group steps">' + BIO_P.map(function (s, i) {
        return '<div class="stepc c-' + s[5] + '" data-i="' + i + '"><div class="L">' + s[0] + '</div><div class="grow"><b>' + esc(s[1]) + '</b><div class="d">' + esc(s[2]) + '</div><div class="more">' + esc(s[3]) + '<span class="say">' + esc(s[4]) + '</span></div></div>' + ic('chev', 'chev') + '</div>';
      }).join('') + '</div><div class="btn-row"><button class="btn tinted" id="bioAll">Barchasini ochish</button></div>';
    $$('.stepc', el).forEach(function (s) { s.onclick = function () { s.classList.toggle('open'); }; });
    $('#bioAll', el).onclick = function () { $$('.stepc', el).forEach(function (s) { s.classList.add('open'); }); };
  }

  /* ---------- 2. Mehnat shartnomasi va sinov muddati tekshirgichi ---------- */
  var CATS = {
    regular:  { name: 'Oddiy tibbiyot xodimi (hamshira, feldsher, farmatsevt)', prob: '3 oygacha belgilanishi mumkin', notice: '14 kalendar kun (xodim tashabbusi bilan)', note: 'OʻzR Mehnat kodeksi 129-moddaga koʻra umumiy dastlabki sinov muddati 3 oydan oshmasligi kerak. Vaqtincha mehnatga qobiliyatsizlik davri sinov muddatiga kirmaydi.' },
    manager:  { name: 'Tashkilot rahbari, bosh shifokor, bosh hisobchi', prob: '6 oygacha belgilanishi mumkin', notice: '2 oy (rahbar) / 1 oy (oʻrinbosar va bosh hisobchi)', note: 'Mehnat kodeksi 129-modda 2-qism: tashkilot rahbarlari, ularning oʻrinbosarlari, bosh buxgalterlar va filial rahbarlari uchun sinov muddati 6 oygacha uzaytirilishi mumkin.' },
    pregnant: { name: 'Homilador ayol yoki 3 yoshgacha bolasi bor ayol', prob: 'Sinov muddati BELGILANMAYDI', notice: '14 kalendar kun (xodim tashabbusi)', note: 'Mehnat kodeksi 129-modda 3-qism: homilador ayollar hamda 3 yoshga toʻlmagan bolasi bor ayollarni ishga qabul qilishda dastlabki sinov belgilanishi qatʼiyan taqiqlanadi.' },
    grad:     { name: 'Texnikum / OTM bitiruvchisi (birinchi marta, 3 yil ichida)', prob: 'Sinov muddati BELGILANMAYDI', notice: '14 kalendar kun', note: 'Taʼlim tashkilotini tamomlagan kundan eʼtiboran 3 yil ichida birinchi marta oʻz mutaxassisligi boʻyicha ishga kirayotgan bitiruvchilarga dastlabki sinov belgilanmaydi.' },
    minor:    { name: '18 yoshga toʻlmagan xodim', prob: 'Sinov muddati BELGILANMAYDI', notice: '14 kalendar kun', note: '18 yoshga toʻlmagan shaxslarga dastlabki sinov belgilanmaydi, shuningdek ular uchun qisqartirilgan ish vaqti (16–18 yosh: 36 soat/hafta) va 30 kunlik taʼtil kafolatlanadi.' },
    short:    { name: '6 oygacha muddatli mehnat shartnomasi', prob: 'Sinov muddati BELGILANMAYDI', notice: '14 kalendar kun (yoki muddat tugashi bilan)', note: '6 oygacha muddatga tuzilgan mehnat shartnomalarida dastlabki sinov belgilanishi mumkin emas (MK 129-modda).' }
  };
  function contractWidget(el) {
    el.innerHTML = '<div class="h2">Mehnat shartnomasi va sinov muddati tekshirgichi</div>' +
      '<div class="card"><p class="muted" style="font-size:14.5px">OʻzR Mehnat kodeksi (129 va 160-moddalar) asosida xodim toifasini tanlang:</p>' +
      '<div class="calc-grid"><div class="calc-field"><label for="catSel">Xodim toifasi</label><select class="calc-select" id="catSel">' +
      Object.keys(CATS).map(function (k) { return '<option value="' + k + '">' + esc(CATS[k].name) + '</option>'; }).join('') +
      '</select></div></div><div class="calc-result" id="catOut"></div></div>';
    function upd() {
      var c = CATS[$('#catSel', el).value];
      $('#catOut', el).innerHTML = '<h4>' + esc(c.name) + '</h4>' +
        '<p><b>Dastlabki sinov muddati:</b> ' + esc(c.prob) + '</p>' +
        '<p><b>Oʻz xohishi bilan boʻshash ogohlantirishi:</b> ' + esc(c.notice) + '</p>' +
        '<p>' + esc(c.note) + '</p>';
    }
    $('#catSel', el).onchange = upd;
    upd();
  }

  /* ---------- 3. Tibbiyot xodimi ish vaqti va ta'til kalkulyatori ---------- */
  function worktimeWidget(el) {
    el.innerHTML = '<div class="h2">Ish vaqti va mehnat taʼtili kalkulyatori</div>' +
      '<div class="card"><p class="muted" style="font-size:14.5px">Yangi Mehnat kodeksi boʻyicha tibbiyot va farmatsiya xodimining haftalik ish vaqti hamda yillik taʼtilini hisoblang:</p>' +
      '<div class="calc-grid">' +
      '<div class="calc-field"><label for="wtRole">Faoliyat turi</label><select class="calc-select" id="wtRole">' +
      '<option value="med">Tibbiyot xodimi (hamshira, feldsher, shifokor)</option>' +
      '<option value="harm">Noqulay / zararli sharoit (rentgen, yuqumli boʻlim)</option>' +
      '<option value="pharm">Farmatsevt / umumiy maʼmuriy xodim</option>' +
      '<option value="minor">18 yoshga toʻlmagan xodim</option>' +
      '</select></div>' +
      '<div class="calc-field"><label for="wtStaj">Bitta tashkilotdagi ish staji</label><select class="calc-select" id="wtStaj">' +
      '<option value="0">5 yilgacha (0 qoʻshimcha kun)</option>' +
      '<option value="2">5–10 yil (+2 kalendar kun)</option>' +
      '<option value="4">10–15 yil (+4 kalendar kun)</option>' +
      '<option value="6">15–20 yil (+6 kalendar kun)</option>' +
      '<option value="8">20 yildan ortiq (+8 kalendar kun)</option>' +
      '</select></div></div><div class="calc-result" id="wtOut"></div></div>';
    function upd() {
      var role = $('#wtRole', el).value, staj = +$('#wtStaj', el).value;
      var hours = role === 'pharm' ? 40 : 36;
      var base = role === 'minor' ? 30 : 21;
      var extra = role === 'harm' ? 12 : (role === 'med' ? 6 : 0);
      var total = base + extra + staj;
      $('#wtOut', el).innerHTML = '<h4>Hisob-kitob natijasi</h4>' +
        '<p><b>Haftalik ish vaqti meʼyori:</b> ' + hours + ' soat' + (hours < 40 ? ' (qisqartirilgan ish vaqti — MK 183-modda)' : ' (normal ish vaqti — MK 182-modda)') + '</p>' +
        '<p><b>Yillik asosiy taʼtil:</b> ' + base + ' kalendar kun (MK 217-modda)</p>' +
        '<p><b>Kasbiy/sharoit qoʻshimcha taʼtil (namunaviy):</b> +' + extra + ' kun</p>' +
        '<p><b>Staj uchun qoʻshimcha taʼtil (MK 220-modda):</b> +' + staj + ' kun</p>' +
        '<p><b>Jami yillik mehnat taʼtili:</b> ' + total + ' kalendar kun</p>';
    }
    $('#wtRole', el).onchange = $('#wtStaj', el).onchange = upd;
    upd();
  }

  /* ---------- 4. Mehnat nizolari va intizomiy jazo algoritmi ---------- */
  var DISP = [
    ['1', 'Intizomiy jazo turlari (MK 312-modda)', 'Faqat 3 ta qonuniy chora mavjud', 'Ish beruvchi faqat quyidagi jazolarni qoʻllashi mumkin: 1) Hayfsan; 2) Oʻrtacha oylik ish haqining 30% gacha (ichki tartib qoidalarida koʻzda tutilgan boʻlsa 50% gacha) jarima; 3) Mehnat shartnomasini bekor qilish.', 'Qonunda nazarda tutilmagan boshqa jazo turlarini qoʻllash taqiqlanadi.', 's1'],
    ['2', 'Jazo qoʻllash muddatlari (MK 314-modda)', '1 oy va 6 oy qoidasi', 'Intizomiy jazo nojoʻya xatti-harakat aniqlangan kundan boshlab 1 oydan kechiktirmay (sodir etilgan kundan 6 oydan, taftish natijasida 2 yildan kechiktirmay) qoʻllaniladi.', 'Jazo qoʻllashdan oldin xodimdan albatta yozma tushuntirish xati talab qilinishi shart.', 's2'],
    ['3', 'Mehnat nizolari komissiyasi (MNK)', 'Sudgacha hal qilish bosqichi', 'Xodim va ish beruvchi oʻrtasidagi yakka mehnat nizosi avval tashkilotdagi MNKga (teng sonli xodim va ish beruvchi vakillaridan iborat) topshirilishi mumkin. Koʻrib chiqish muddati — 10 kun.', 'MNK qaroridan norozi taraf 10 kun ichida sudga murojaat qilish huquqiga ega.', 's3'],
    ['4', 'Sudga murojaat qilish muddatlari (MK 560-modda)', '3 oy / 6 oy / muddatsiz', 'Ishga tiklash nizolari boʻyicha — buyruq nusxasi berilgan kundan 3 oy; boshqa mehnat nizolari boʻyicha — huquq buzilganini bilgan kundan 6 oy; xodim sogʻligʻiga yetkazilgan zarar boʻyicha — muddat cheklanmaydi.', 'Xodimlar mehnat nizolari boʻyicha sudda davlat bojini toʻlashdan ozod qilinadi.', 's4']
  ];
  function disputeWidget(el) {
    el.innerHTML = '<div class="h2">Intizomiy jazo va mehnat nizosi algoritmi</div>' +
      '<p class="section-f" style="margin:-4px 4px 12px">Har bir bosqichni bosib, OʻzR Mehnat kodeksi talablari va muddatlarini koʻring.</p>' +
      '<div class="group steps">' + DISP.map(function (s, i) {
        return '<div class="stepc c-' + s[5] + '" data-i="' + i + '"><div class="L">' + s[0] + '</div><div class="grow"><b>' + esc(s[1]) + '</b><div class="d">' + esc(s[2]) + '</div><div class="more">' + esc(s[3]) + '<span class="say">' + esc(s[4]) + '</span></div></div>' + ic('chev', 'chev') + '</div>';
      }).join('') + '</div><div class="btn-row"><button class="btn tinted" id="dpAll">Barchasini ochish</button></div>';
    $$('.stepc', el).forEach(function (s) { s.onclick = function () { s.classList.toggle('open'); }; });
    $('#dpAll', el).onclick = function () { $$('.stepc', el).forEach(function (s) { s.classList.add('open'); }); };
  }

  var WIDGETS = { bioethics: bioethicsWidget, contract: contractWidget, worktime: worktimeWidget, dispute: disputeWidget };

  /* ======================================================
     TESTLAR
     ====================================================== */
  function renderTests() {
    setTab('tests'); setNav({ title: 'Testlar' });
    var ts = topics(), fb = get('final', {})[dir];
    view.innerHTML = '<div class="large-title">Testlar</div>' + dirSeg() +
      '<div class="card c-s1" style="margin-top:12px"><h3>' + ic('shuffle') + 'Yakuniy test</h3><p class="muted">“' + esc(D().name) + '” yoʻnalishining barcha mavzularidan tasodifiy 30 ta savol.' + (fb != null ? ' Eng yaxshi natija: <b style="color:var(--label)">' + fb + '%</b>' : '') + '</p>' +
      '<div class="btn-row"><a class="btn" href="#/final">Boshlash</a></div></div>' +
      '<div class="section-h">Mavzular boʻyicha</div><div class="group">' + ts.map(function (t) {
        var s = getScore(t);
        return '<a class="row c-' + t.color + '" href="#/t/' + t.n + '/test"><div class="ic">' + t.n + '</div><div class="grow"><div class="t">' + esc(t.title) + '</div></div>' +
          (s != null ? '<div class="ring sm c-' + grade(s)[1] + '" style="--p:' + s + '"><b>' + s + '</b></div>' : '<span class="val">—</span>') + ic('chev', 'chev') + '</a>';
      }).join('') + '</div>';
    bindDirSeg(view, renderTests);
  }
  function dirBlocks() { var ids = []; topics().forEach(function (t) { ids = ids.concat(t.blocks); }); return uniq(ids); }
  function renderFinal() {
    setTab('tests'); setNav({ back: '#/tests', backLabel: 'Testlar', title: 'Yakuniy test' });
    view.innerHTML = '<div class="title-block c-s1"><div class="code">' + esc(D().name) + '</div><h1>Yakuniy test</h1></div><div id="fq"><div class="spinner"></div></div>';
    loadMany(dirBlocks()).then(function (ds) {
      var all = [];
      ds.filter(Boolean).forEach(function (d) { all = all.concat(d.tests || []); });
      var el = $('#fq');
      if (!el) return;
      if (!all.length) { el.innerHTML = '<div class="empty">Savollar topilmadi.</div>'; return; }
      runQuiz(el, function () { return prepQs(all, 30); }, function (p) { var f = get('final', {}); if (f[dir] == null || p > f[dir]) f[dir] = p; put('final', f); });
    });
  }

  /* ======================================================
     LUG'AT
     ====================================================== */
  function renderGlossary() {
    setTab('glossary'); setNav({ title: 'Lugʻat' });
    view.innerHTML = '<div class="large-title">Lugʻat</div>' + dirSeg() + '<div style="height:10px"></div><div id="gl"><div class="spinner"></div></div>';
    bindDirSeg(view, renderGlossary);
    var ts = topics();
    loadMany(dirBlocks()).then(function () {
      var el = $('#gl');
      if (!el) return;
      var seen = {}, list = [];
      ts.forEach(function (t) {
        t.blocks.forEach(function (id) {
          var d = window.HUQ_T[id];
          if (!d) return;
          (d.glossary || []).forEach(function (g) {
            var k = g.t.toLowerCase();
            if (!seen[k]) { seen[k] = 1; list.push({ t: g.t, d: g.d, src: t.n + '-mavzu' }); }
          });
        });
      });
      list.sort(uzCmp);
      function draw(q) {
        q = uzNorm((q || '').trim());
        var f = list.filter(function (g) { return !q || uzNorm(g.t).indexOf(q) >= 0 || uzNorm(g.d).indexOf(q) >= 0; });
        var out = '', L = '', buf = [];
        function flush() { if (buf.length) { out += '<div class="letter">' + esc(L) + '</div><div class="group">' + buf.join('') + '</div>'; buf = []; } }
        f.forEach(function (g) {
          var l = g.t.charAt(0).toUpperCase();
          if (l !== L) { flush(); L = l; }
          buf.push(termRow(g));
        });
        flush();
        $('#glist', el).innerHTML = out || '<div class="empty">Hech narsa topilmadi.</div>';
        $('#gcount', el).textContent = f.length + ' ta atama';
      }
      el.innerHTML = '<label class="search">' + ic('search') + '<input id="gq" type="search" placeholder="Atamani qidirish" autocomplete="off"></label>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin:0 4px 4px"><span class="muted" id="gcount" style="font-size:13px"></span><button class="btn tinted sm" id="gfc">' + ic('flip') + 'Kartochkalar</button></div><div id="glist"></div>';
      $('#gq', el).oninput = function () { draw(this.value); };
      $('#gfc', el).onclick = function () { flashcards(el, list, renderGlossary); };
      draw('');
    });
  }

  /* ======================================================
     NATIJALAR
     ====================================================== */
  function renderProfile() {
    setTab('profile'); setNav({ title: 'Natijalar' });
    var ts = topics(), readN = ts.filter(isRead).length, pct = Math.round(readN / ts.length * 100);
    var sc = ts.map(getScore).filter(function (x) { return x != null; });
    var avg = sc.length ? Math.round(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length) : null;
    var fb = get('final', {})[dir];
    var th = get('theme', 'auto');
    view.innerHTML = '<div class="large-title">Natijalar</div>' + dirSeg() +
      '<div class="card" style="text-align:center;margin-top:12px;padding:22px 16px"><div class="ring c-green" style="--p:' + pct + '"><b>' + pct + '%</b></div><p style="margin:12px 0 0"><b>' + readN + ' / ' + ts.length + '</b> mavzu oʻrganildi</p></div>' +
      '<div class="stats cols3">' + stat(sc.length + '/' + ts.length, 'Topshirilgan test', 'c-blue') + stat(avg != null ? avg + '%' : '—', 'Oʻrtacha natija', 'c-orange') + stat(fb != null ? fb + '%' : '—', 'Yakuniy test', 'c-indigo') + '</div>' +
      '<div class="section-h">Mavzular</div><div class="group">' + ts.map(function (t) {
        var s = getScore(t);
        return '<a class="row c-' + t.color + '" href="#/t/' + t.n + '"><div class="ic">' + t.n + '</div><div class="grow"><div class="t">' + esc(t.title) + '</div><div class="s">' + (isRead(t) ? '<span style="color:var(--green);font-weight:600">✓ Oʻrganilgan</span>' : 'Oʻrganilmagan') + ' · Test: ' + (s != null ? s + '%' : '—') + '</div></div>' + ic('chev', 'chev') + '</a>';
      }).join('') + '</div>' +
      '<div class="section-h">Maʼlumotlar</div><div class="group"><button class="row" id="about" style="--inset:16px"><div class="grow"><div class="t">Resurs haqida</div></div>' + ic('chev', 'chev') + '</button>' +
      '<button class="row" id="reset" style="--inset:16px"><div class="grow"><div class="t" style="color:var(--red);font-weight:600">Natijalarni tozalash</div></div></button></div>' +
      '<p class="section-f">Natijalar faqat shu qurilmaning brauzerida saqlanadi.</p>';
    bindDirSeg(view, renderProfile);
    $('#about').onclick = aboutSheet;
    $('#reset').onclick = function () {
      if (confirm('Barcha oʻrganilgan mavzular va test natijalari oʻchiriladi. Davom etasizmi?')) { put('read', {}); put('score', {}); put('final', {}); renderProfile(); }
    };
  }

  /* ======================================================
     PLAKAT KO'RISH OYNASI va SHEET
     ====================================================== */
  var viewer = $('#viewer'), vScroll = $('#viewerScroll'), vImg = $('#viewerImg');
  function openViewer(src, title) {
    vImg.src = src; vImg.alt = title; $('#viewerTitle').textContent = title;
    vScroll.classList.remove('zoomed'); viewer.hidden = false; document.body.style.overflow = 'hidden';
  }
  function closeViewer() { if (!viewer.hidden) { viewer.hidden = true; document.body.style.overflow = ''; vImg.removeAttribute('src'); } }
  vImg.onclick = function (e) {
    var zoom = !vScroll.classList.contains('zoomed');
    var rx = e.offsetX / vImg.clientWidth, ry = e.offsetY / vImg.clientHeight;
    vScroll.classList.toggle('zoomed', zoom);
    if (zoom) { vScroll.scrollLeft = rx * vImg.clientWidth - vScroll.clientWidth / 2; vScroll.scrollTop = ry * vImg.clientHeight - vScroll.clientHeight / 2; }
  };
  $('#viewerClose').onclick = closeViewer;

  var sheet = $('#sheet');
  function openSheet(html) { $('#sheetBody').innerHTML = html; sheet.hidden = false; }
  function closeSheet() { sheet.hidden = true; }
  sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeViewer(); closeSheet(); } });

  route();
})();
