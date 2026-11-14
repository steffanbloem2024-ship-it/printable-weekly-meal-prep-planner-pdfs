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

  var KEY = 'prepsheet.week.v2';
  var OLD_KEY = 'prepsheet.week.v1';   // migrated on first load, then removed
  var BANK_KEY = 'prepsheet.bank.v1';
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var MAX = core.MAX;

  var $ = function (id) { return document.getElementById(id); };
  var sel = [];          // chosen dinner objects, in day order
  var filter = 'all';
  var bank = [];         // "your dinners": typed in by the family, saved locally
  var ownSeq = 0;
  var undoStash = null;

  /* ----------------------------------------------------------- persistence
   * Two things are stored, both in this browser only:
   *   prepsheet.week.v2  — the five dinners chosen, in day order
   *   prepsheet.bank.v1  — "your dinners": the ones the family typed in
   * Nothing is uploaded; there is no account and no server to upload to.
   */

  function save() {
    try {
      if (!sel.length) { localStorage.removeItem(KEY); return; }
      var data = sel.map(function (d) { return d.own ? { own: d.id } : { id: d.id }; });
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* private mode, full quota — not worth bothering the user */ }
  }

  function saveBank() {
    try {
      if (!bank.length) { localStorage.removeItem(BANK_KEY); return; }
      localStorage.setItem(BANK_KEY, JSON.stringify(bank.map(function (d) {
        return { id: d.id, name: d.name, items: d.items };
      })));
    } catch (e) {}
  }

  /* A dinner the family typed in. `items` may be empty: a name alone still
     earns a place on the plan, it just leaves blank lines on the list. */
  function makeOwn(name, items, id) {
    var clean = [];
    (items || []).slice(0, core.MAX_OWN_ITEMS).forEach(function (it) {
      if (!it || typeof it.name !== 'string' || !it.name.trim()) return;
      var nm = it.name.slice(0, 44);
      clean.push({
        name: nm,
        qty: typeof it.qty === 'string' ? it.qty.slice(0, 20) : '',
        section: core.SECTIONS.indexOf(it.section) !== -1 ? it.section : core.guessSection(nm)
      });
    });
    if (id && /^own-\d+$/.test(id)) {
      var n = parseInt(id.slice(4), 10);
      if (n > ownSeq) ownSeq = n;
    } else {
      ownSeq++;
      id = 'own-' + ownSeq;
    }
    return {
      id: id, own: true, name: String(name == null ? '' : name).trim().slice(0, 60),
      time: '', hands: 'Your own', night: '', prep: '', items: clean
    };
  }

  function bankById(id) {
    for (var k = 0; k < bank.length; k++) if (bank[k].id === id) return bank[k];
    return null;
  }

  function loadBank() {
    var raw = null, data;
    try { raw = localStorage.getItem(BANK_KEY); } catch (e) { return; }
    if (!raw) return;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(data)) return;
    data.slice(0, 40).forEach(function (e) {
      if (!e || typeof e.name !== 'string' || !e.name.trim()) return;
      bank.push(makeOwn(e.name, Array.isArray(e.items) ? e.items : [], e.id));
    });
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (raw === null) { migrateV1(); return; }
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(data)) return;
    data.slice(0, MAX).forEach(function (entry) {
      if (!entry) return;
      if (entry.id) {
        var d = core.byId(entry.id);
        if (d && sel.indexOf(d) === -1) sel.push(d);
      } else if (entry.own) {
        var o = bankById(String(entry.own));
        if (o && sel.indexOf(o) === -1) sel.push(o);
      }
    });
  }

  /* Anyone who used the first version of this page has a v1 week saved, in
     which an own dinner was only a name. Move those names into the dinner bank
     rather than letting a saved week vanish under them. */
  function migrateV1() {
    var raw = null;
    try { raw = localStorage.getItem(OLD_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (Array.isArray(data)) {
      data.slice(0, MAX).forEach(function (entry) {
        if (!entry) return;
        if (entry.id) {
          var d = core.byId(entry.id);
          if (d && sel.indexOf(d) === -1) sel.push(d);
        } else if (entry.custom) {
          var o = makeOwn(String(entry.custom), []);
          bank.push(o);
          sel.push(o);
        }
      });
    }
    try { localStorage.removeItem(OLD_KEY); } catch (e) {}
    saveBank();
    save();
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
      mid.appendChild(el('span', 'ctime', d.own
        ? (d.items.length ? 'yours · ' + d.items.length + ' ingredients' : 'yours · no ingredients')
        : d.time + ' · ' + d.hands));
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

    // Own dinners with ingredients are already merged into the list above;
    // only the ones with nothing typed in still need write-in room.
    var needWrite = sel.filter(function (d) { return d.own && !d.items.length; });
    var blanks = el('div', 'gsec');
    blanks.appendChild(el('h3', null, needWrite.length ? 'For your own dinners' : 'Anything else'));
    if (needWrite.length) {
      blanks.appendChild(el('p', 'fine-note', 'Write in what you need for: ' +
        needWrite.map(function (d) { return d.name; }).join(', ') + '.'));
    }
    var bl = el('ul', 'checklist blank-lines');
    for (var b = 0; b < (needWrite.length ? 8 : 5); b++) {
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

  /* ------------------------------------------------------- your own dinners */

  function renderBank() {
    var box = $('bank'), grid = $('bank-grid'), note = $('bank-note');
    grid.textContent = '';
    box.hidden = bank.length === 0;
    note.textContent = bank.length
      ? 'Saved in this browser only, ready for next week. Tap one to put it on the plan.'
      : '';
    bank.forEach(function (d) {
      var card = el('div', 'dcard is-own');
      if (isSelected(d)) card.classList.add('is-on');
      else if (sel.length >= MAX) card.classList.add('is-dim');

      var pick = el('button', 'dcard-pick');
      pick.type = 'button';
      pick.setAttribute('aria-pressed', isSelected(d) ? 'true' : 'false');
      var top = el('div', 'dcard-top');
      top.appendChild(el('span', 'tick', isSelected(d) ? '✓' : '+'));
      top.appendChild(el('span', 'dname', d.name));
      pick.appendChild(top);
      var meta = el('div', 'dmeta');
      meta.appendChild(el('span', 'time', 'yours'));
      meta.appendChild(el('span', 'hands', d.items.length
        ? d.items.length + (d.items.length === 1 ? ' ingredient' : ' ingredients')
        : 'no ingredients yet'));
      pick.appendChild(meta);
      pick.appendChild(el('p', 'dprep', d.items.length
        ? d.items.map(function (it) { return it.name; }).join(', ')
        : 'Goes on the plan; the grocery list leaves blank lines for it.'));
      pick.addEventListener('click', function () { toggle(d); });
      card.appendChild(pick);
      card.appendChild(btn('×', 'Delete ' + d.name + ' from your dinners',
                           function () { removeFromBank(d); }, false, 'rm'));
      grid.appendChild(card);
    });
  }

  /* Deleting loses typed work, so it is always undoable for one step. */
  function removeFromBank(d) {
    var at = bank.indexOf(d);
    if (at === -1) return;
    var selAt = sel.indexOf(d);
    bank.splice(at, 1);
    if (selAt !== -1) sel.splice(selAt, 1);
    undoStash = { dinner: d, at: at, selAt: selAt };
    saveBank();
    update();
    var note = $('bank-note');
    note.textContent = 'Deleted “' + d.name + '”. ';
    var u = el('button', 'linkish', 'Undo');
    u.type = 'button';
    u.addEventListener('click', undoDelete);
    note.appendChild(u);
  }

  function undoDelete() {
    if (!undoStash) return;
    var st = undoStash;
    undoStash = null;
    bank.splice(Math.min(st.at, bank.length), 0, st.dinner);
    if (st.selAt !== -1 && sel.length < MAX) sel.splice(Math.min(st.selAt, sel.length), 0, st.dinner);
    saveBank();
    update();
    $('bank-note').textContent = 'Put back.';
  }

  /* Say out loud how the typed ingredients were read, including which aisle
     each went to. A silent guess the user cannot see is a guess they cannot
     correct. */
  function describeOwn(d, added) {
    var where = added ? 'added to this week' : 'saved to your dinners — this week is already full';
    if (!d.items.length) {
      return '“' + d.name + '” ' + where + '. No ingredients read, so the printed list ' +
             'leaves blank lines for it.';
    }
    var byAisle = {};
    d.items.forEach(function (it) {
      (byAisle[it.section] = byAisle[it.section] || [])
        .push(it.qty ? it.name + ' (' + it.qty + ')' : it.name);
    });
    var parts = core.SECTIONS.filter(function (s) { return byAisle[s]; }).map(function (s) {
      return s + ' — ' + byAisle[s].join(', ');
    });
    var hint = byAisle['Other / Household']
      ? ' Anything in Other / Household was a guess: put “pantry:” or “produce:” in ' +
        'front of a group to place it yourself.'
      : '';
    return '“' + d.name + '” ' + where + '. Read ' + d.items.length +
           (d.items.length === 1 ? ' ingredient: ' : ' ingredients: ') + parts.join(' · ') + '.' + hint;
  }

  /* --------------------------------------------------------------- plumbing */

  function update() {
    // Any real action clears the "five is the number" warning rather than
    // leaving it on screen for the rest of its timer.
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    $('counter').classList.remove('is-full');
    renderCounter();
    renderGrid();
    renderBank();
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
      var nameEl = $('own-input'), itemsEl = $('own-items'), note = $('own-read');
      var name = (nameEl.value || '').trim();
      if (!name) {
        note.textContent = 'Give the dinner a name first — then its ingredients underneath, ' +
          'if you want them on the grocery list.';
        return;
      }
      var d = makeOwn(name, core.parseIngredients(itemsEl.value || ''));
      bank.push(d);
      saveBank();
      var added = sel.length < MAX;
      if (added) sel.push(d);
      nameEl.value = '';
      itemsEl.value = '';
      update();
      note.textContent = describeOwn(d, added);
    }

    $('print').addEventListener('click', function () { window.print(); });

    $('reset').addEventListener('click', function () {
      // Start over clears the week, never the dinners the family typed in.
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

    loadBank();
    if (!loadFromQuery()) load();
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
