/*
 * planner.js — the PrepSheet free Week Builder (browser only).
 *
 * No framework, no network calls, no analytics. The chosen week is kept in
 * localStorage so a reload does not lose it; that is the only place it ever
 * goes. planner-core.js holds the data and all the arithmetic.
 */
(function () {
  'use strict';

  var core = window.PrepSheetCore;
  if (!core) return;

  var KEY = 'prepsheet.week.v1';
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var MAX = core.MAX;

  var $ = function (id) { return document.getElementById(id); };
  var sel = [];          // chosen dinner objects, in day order
  var filter = 'all';
  var customSeq = 0;

  /* ----------------------------------------------------------- persistence */

  function save() {
    try {
      if (!sel.length) { localStorage.removeItem(KEY); return; }
      var data = sel.map(function (d) { return d.custom ? { custom: d.name } : { id: d.id }; });
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* private mode, full quota — not worth bothering the user */ }
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(data)) return;
    data.slice(0, MAX).forEach(function (entry) {
      if (entry && entry.id) {
        var d = core.byId(entry.id);
        if (d && sel.indexOf(d) === -1) sel.push(d);
      } else if (entry && entry.custom) {
        sel.push(makeCustom(String(entry.custom)));
      }
    });
  }

  /* A shared link such as planner.html?week=taco-night,pizza-night opens that
     exact week. It only reads dinner ids from our own list; anything else in
     the query is ignored. Returns true if it set the week. */
  function loadFromQuery() {
    var q;
    try { q = (typeof location !== 'undefined' && location.search) || ''; } catch (e) { return false; }
    var m = /[?&]week=([^&#]*)/.exec(q);
    if (!m) return false;
    var picked = [];
    decodeURIComponent(m[1]).split(',').forEach(function (id) {
      var d = core.byId(id.trim());
      if (d && picked.indexOf(d) === -1 && picked.length < MAX) picked.push(d);
    });
    if (!picked.length) return false;
    sel = picked;
    // Drop the query so a later reload keeps the user's edits instead of
    // re-applying the preset over them.
    try { history.replaceState(null, '', location.pathname + (location.hash || '')); } catch (e) {}
    return true;
  }

  function makeCustom(name) {
    customSeq++;
    return {
      id: 'custom-' + customSeq,
      custom: true,
      name: name.slice(0, 60),
      time: '',
      hands: 'Your own',
      night: '',
      prep: '',
      items: []
    };
  }

  /* --------------------------------------------------------------- filters */

  function isMeatFree(d) {
    var hasMeat = d.items.some(function (it) { return it.section === 'Meat & Fish'; });
    return !hasMeat && !/shrimp|fish|salmon|cod|prawn/i.test(d.name);
  }

  function minutes(d) {
    var m = /(\d+)/.exec(d.time || '');
    return m ? parseInt(m[1], 10) : 999;
  }

  function matches(d) {
    if (filter === 'all') return true;
    if (filter === 'fast') return minutes(d) <= 20;
    if (filter === 'oven') return /oven/i.test(d.hands || '');
    if (filter === 'onepot') return /one pot/i.test(d.hands || '');
    if (filter === 'meatfree') return isMeatFree(d);
    return true;
  }

  /* ------------------------------------------------------------- selection */

  function isSelected(d) { return sel.indexOf(d) !== -1; }

  function toggle(d) {
    var at = sel.indexOf(d);
    if (at !== -1) { sel.splice(at, 1); }
    else if (sel.length >= MAX) { flashFull(); return; }
    else { sel.push(d); }
    update();
  }

  var flashTimer = null;
  function flashFull() {
    var c = $('counter');
    c.textContent = 'Five is the number — remove one first.';
    c.classList.add('is-full');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { c.classList.remove('is-full'); renderCounter(); }, 2200);
  }

  function move(idx, dir) {
    var to = idx + dir;
    if (to < 0 || to >= sel.length) return;
    var tmp = sel[idx]; sel[idx] = sel[to]; sel[to] = tmp;
    update();
  }

  /* ------------------------------------------------------------ rendering */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderCounter() {
    var c = $('counter');
    if (c.classList.contains('is-full')) return;
    var n = sel.length;
    c.textContent = n === MAX ? 'Five chosen — your week is below.' : n + ' of ' + MAX + ' chosen';
  }

  function renderGrid() {
    var grid = $('grid');
    grid.textContent = '';
    core.DINNERS.filter(matches).forEach(function (d) {
      var card = el('button', 'dcard');
      card.type = 'button';
      card.setAttribute('aria-pressed', isSelected(d) ? 'true' : 'false');
      if (isSelected(d)) card.classList.add('is-on');
      else if (sel.length >= MAX) card.classList.add('is-dim');

      var top = el('div', 'dcard-top');
      top.appendChild(el('span', 'tick', isSelected(d) ? '✓' : '+'));
      top.appendChild(el('span', 'dname', d.name));
      card.appendChild(top);

      var meta = el('div', 'dmeta');
      meta.appendChild(el('span', 'time', d.time));
      meta.appendChild(el('span', 'hands', d.hands));
      card.appendChild(meta);

      card.appendChild(el('p', 'dprep', d.prep));
      card.addEventListener('click', function () { toggle(d); });
      grid.appendChild(card);
    });
    if (!grid.children.length) {
      grid.appendChild(el('p', 'fine-note', 'No dinners match that filter.'));
    }
  }

  function renderChosen() {
    var list = $('chosen');
    list.textContent = '';
    sel.forEach(function (d, idx) {
      var li = el('li', 'crow');
      li.appendChild(el('span', 'cday', DAYS[idx] || ''));
      var mid = el('div', 'cmid');
      mid.appendChild(el('b', null, d.name));
      mid.appendChild(el('span', 'ctime', d.custom ? 'your own dinner' : d.time + ' · ' + d.hands));
      li.appendChild(mid);

      var ctl = el('div', 'cctl');
      ctl.appendChild(btn('↑', 'Move ' + d.name + ' earlier', function () { move(idx, -1); }, idx === 0));
      ctl.appendChild(btn('↓', 'Move ' + d.name + ' later', function () { move(idx, 1); }, idx === sel.length - 1));
      ctl.appendChild(btn('×', 'Remove ' + d.name, function () { sel.splice(idx, 1); update(); }, false, 'rm'));
      li.appendChild(ctl);
      list.appendChild(li);
    });
    for (var k = sel.length; k < MAX; k++) {
      var blank = el('li', 'crow is-blank');
      blank.appendChild(el('span', 'cday', DAYS[k]));
      blank.appendChild(el('div', 'cmid', 'not chosen yet'));
      list.appendChild(blank);
    }
  }

  function btn(label, aria, fn, disabled, cls) {
    var b = el('button', 'mini' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.setAttribute('aria-label', aria);
    if (disabled) b.disabled = true;
    b.addEventListener('click', fn);
    return b;
  }

  function renderSheet() {
    var body = $('plan-body');
    body.textContent = '';
    sel.forEach(function (d, idx) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', 'd', DAYS[idx]));
      tr.appendChild(el('td', 'm', d.name));
      tr.appendChild(el('td', 't', d.time || '—'));
      body.appendChild(tr);
    });
    ['Saturday', 'Sunday'].forEach(function (day) {
      var tr = document.createElement('tr');
      tr.className = 'open-night';
      tr.appendChild(el('th', 'd', day));
      tr.appendChild(el('td', 'm', 'Open on purpose — leftovers, kids’ pick, or takeout'));
      tr.appendChild(el('td', 't', '—'));
      body.appendChild(tr);
    });

    // Tonight's instructions, for the dinners that have them.
    var tn = $('tonight');
    tn.textContent = '';
    var withNight = sel.filter(function (d) { return d.night; });
    if (withNight.length) {
      tn.appendChild(el('h3', null, 'On the night'));
      var dl = el('dl', 'nights');
      sel.forEach(function (d, idx) {
        if (!d.night) return;
        dl.appendChild(el('dt', null, DAYS[idx] + ' — ' + d.name));
        dl.appendChild(el('dd', null, d.night));
      });
      tn.appendChild(dl);
    }

    // Sunday prep block.
    var pb = $('prep-block');
    pb.textContent = '';
    var prep = core.buildPrep(sel);
    pb.appendChild(el('h3', null, 'The prep block — do these once, before the week starts'));
    if (prep.length) {
      var ul = el('ul', 'checklist');
      prep.forEach(function (p) {
        var li = el('li', null);
        li.appendChild(el('span', 'box', ''));
        var t = el('span', 'txt', p.text);
        li.appendChild(t);
        ul.appendChild(li);
      });
      pb.appendChild(ul);
    } else {
      pb.appendChild(el('p', 'fine-note', 'Nothing needs prepping ahead this week — enjoy it.'));
    }
    pb.appendChild(el('p', 'prep-rule', 'Prep components, not finished meals: one protein, one grain, one vegetable survives a week that changes.'));

    // Grocery list.
    var gl = $('glist');
    gl.textContent = '';
    var groups = core.buildList(sel);
    groups.forEach(function (g) {
      var box = el('div', 'gsec');
      box.appendChild(el('h3', null, g.section));
      var ul = el('ul', 'checklist');
      g.items.forEach(function (it) {
        var li = el('li', null);
        li.appendChild(el('span', 'box', ''));
        var txt = el('span', 'txt', null);
        txt.appendChild(el('b', null, it.name));
        if (it.qty) txt.appendChild(el('span', 'qty', ' — ' + it.qty));
        if (it.forDinners.length) {
          txt.appendChild(el('span', 'forwhat', 'for ' + it.forDinners.map(shortName).join(', ')));
        }
        li.appendChild(txt);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      gl.appendChild(box);
    });

    var customs = sel.filter(function (d) { return d.custom; });
    var blanks = el('div', 'gsec');
    blanks.appendChild(el('h3', null, customs.length ? 'For your own dinners' : 'Anything else'));
    if (customs.length) {
      blanks.appendChild(el('p', 'fine-note', 'Write in what you need for: ' +
        customs.map(function (d) { return d.name; }).join(', ') + '.'));
    }
    var bl = el('ul', 'checklist blank-lines');
    for (var b = 0; b < (customs.length ? 8 : 5); b++) {
      var li = el('li', null);
      li.appendChild(el('span', 'box', ''));
      li.appendChild(el('span', 'txt rule', ''));
      bl.appendChild(li);
    }
    blanks.appendChild(bl);
    gl.appendChild(blanks);
  }

  // "Sheet-Pan Chicken Thighs, Potatoes & Green Beans" -> "Sheet-Pan Chicken Thighs"
  function shortName(n) {
    var cut = n.split(/,| with | \+ /)[0];
    return cut.length > 34 ? cut.slice(0, 32).replace(/\s+\S*$/, '') + '…' : cut;
  }

  function groceryText() {
    var out = ['Grocery list — ' + sel.length + ' dinners (PrepSheet)', ''];
    core.buildList(sel).forEach(function (g) {
      out.push(g.section.toUpperCase());
      g.items.forEach(function (it) {
        out.push('- ' + it.name + (it.qty ? ' — ' + it.qty : ''));
      });
      out.push('');
    });
    out.push('DINNERS');
    sel.forEach(function (d, idx) { out.push('- ' + DAYS[idx] + ': ' + d.name); });
    return out.join('\n');
  }

  /* --------------------------------------------------------------- plumbing */

  function update() {
    // Any real action clears the "five is the number" warning rather than
    // leaving it on screen for the rest of its timer.
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    $('counter').classList.remove('is-full');
    renderCounter();
    renderGrid();
    renderChosen();
    var any = sel.length > 0;
    var full = sel.length === MAX;
    $('step2').hidden = !any;
    $('step3').hidden = !any;
    $('sheet').hidden = !any;
    $('upsell').hidden = !full;
    renderSheet();
    save();
  }

  function init() {
    $('build').hidden = false;

    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (chip) {
      chip.addEventListener('click', function () {
        filter = chip.getAttribute('data-filter');
        Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
          c.classList.toggle('is-on', c === chip);
        });
        renderGrid();
      });
    });

    $('own-add').addEventListener('click', addOwn);
    $('own-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addOwn(); }
    });

    function addOwn() {
      var input = $('own-input');
      var name = (input.value || '').trim();
      if (!name) return;
      if (sel.length >= MAX) { flashFull(); return; }
      sel.push(makeCustom(name));
      input.value = '';
      update();
    }

    $('print').addEventListener('click', function () { window.print(); });

    $('reset').addEventListener('click', function () {
      sel = [];
      try { localStorage.removeItem(KEY); } catch (e) {}
      update();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('copy').addEventListener('click', function () {
      var text = groceryText();
      var note = $('copy-note');
      var done = function () { note.textContent = 'Grocery list copied — paste it into your notes app.'; };
      var failed = function () { note.textContent = 'Could not copy automatically — use the print button instead.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, failed);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy') ? done() : failed(); } catch (e) { failed(); }
        document.body.removeChild(ta);
      }
    });

    if (!loadFromQuery()) load();
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
