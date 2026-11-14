/*
 * planner-core.js — PrepSheet free Week Builder: data + pure logic.
 *
 * No DOM, no network, no dependencies. Runs in the browser and in Node
 * (products/tools/planner-test.js exercises the merge arithmetic), so the
 * grocery-list maths is testable instead of eyeballed.
 *
 * Every dinner here is real content from the four Starter Rotations in the
 * PrepSheet System. Ingredient quantities are per-dinner for a family of
 * four-ish and merge by name when two dinners need the same thing.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrepSheetCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SECTIONS = ['Produce', 'Meat & Fish', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Other / Household'];

  // Section shorthands used in the dinner data below.
  var P = 'Produce', M = 'Meat & Fish', D = 'Dairy & Eggs', Y = 'Pantry & Dry Goods', F = 'Frozen', O = 'Other / Household';

  function i(name, qty, section) { return { name: name, qty: qty || '', section: section }; }

  var DINNERS = [
    {
      id: 'sheetpan-chicken',
      name: 'Sheet-Pan Chicken Thighs, Potatoes & Green Beans',
      time: '35 min',
      hands: 'Mostly oven',
      rotation: 1,
      night: 'Toss thighs and halved potatoes in oil, salt, pepper and paprika. 425°F / 220°C for 30 min; add green beans for the last 10.',
      prep: 'Halve the potatoes and trim the green beans.',
      items: [i('Bone-in chicken thighs', '2.5 lb', M), i('Baby potatoes', '2 lb', P), i('Green beans', '1 lb', P), i('Olive oil', '', Y), i('Paprika', '', Y)]
    },
    {
      id: 'taco-night',
      name: 'Taco Night',
      time: '20 min',
      hands: 'Hands-on',
      rotation: 1,
      night: 'Brown the beef with taco seasoning. Put the toppings on the table and let everyone build their own.',
      prep: 'Shred the cheese and lettuce; dice the tomatoes into one container.',
      items: [i('Ground beef', '2 lb', M), i('Taco seasoning', '1 packet', Y), i('Small tortillas', '12', Y), i('Cheddar', '8 oz', D), i('Romaine lettuce', '1', P), i('Tomatoes', '3', P), i('Sour cream', '1 tub', D)]
    },
    {
      id: 'hidden-veg-pasta',
      name: 'Pasta with Hidden-Veg Tomato Sauce + Garlic Bread',
      time: '25 min',
      hands: 'Easy',
      rotation: 1,
      night: 'Boil the pasta. Warm the blended sauce. Butter and broil the bread.',
      prep: 'Make the sauce: soften onion, carrot and zucchini, add crushed tomatoes, simmer 20 min, blend smooth. Keeps 5 days.',
      items: [i('Pasta', '1 lb', Y), i('Crushed tomatoes', '2 cans', Y), i('Onions', '1', P), i('Carrots', '2', P), i('Zucchini', '1', P), i('Garlic', '1 head', P), i('Crusty bread', '1 loaf', Y), i('Butter', '', D), i('Parmesan', '', D)]
    },
    {
      id: 'burrito-bowls',
      name: 'Beef & Rice Burrito Bowls',
      time: '15 min',
      hands: 'Easy',
      rotation: 1,
      night: 'Brown the beef. Build bowls with rice, black beans, corn, cheese and whatever toppings are around.',
      prep: 'Cook the big pot of rice.',
      items: [i('Ground beef', '1 lb', M), i('Long-grain rice', '1 lb', Y), i('Black beans', '1 can', Y), i('Corn', '1 bag', F), i('Cheddar', '4 oz', D)]
    },
    {
      id: 'pizza-night',
      name: 'Pizza Night',
      time: '25 min',
      hands: 'Kids help',
      rotation: 1,
      night: 'Stretch the dough onto oiled pans, sauce, cheese, bake at 475°F / 245°C for 12–14 min. Kids top their own half.',
      prep: 'Nothing — this night is meant to be easy.',
      items: [i('Pizza dough', '2 balls', Y), i('Pizza sauce', '1 jar', Y), i('Mozzarella', '8 oz', D)]
    },
    {
      id: 'honey-soy-salmon',
      name: 'Honey-Soy Salmon, Rice & Cucumber Salad',
      time: '18 min',
      hands: 'Mostly oven',
      rotation: 2,
      night: 'Brush the salmon with the sauce, bake 400°F / 205°C for 12 min. Reheat rice. Dress cucumbers with rice vinegar and a pinch of sugar.',
      prep: 'Mix the honey-soy sauce in a jar (soy, honey, grated garlic, a little sesame oil). Slice the cucumbers.',
      items: [i('Salmon fillets', '4', M), i('Long-grain rice', '1 lb', Y), i('Cucumbers', '3', P), i('Garlic', '1 head', P), i('Soy sauce', '', Y), i('Honey', '', Y), i('Sesame oil', '', Y), i('Rice vinegar', '', Y)]
    },
    {
      id: 'quesadillas',
      name: 'Chicken Quesadillas + Tomato Soup',
      time: '15 min',
      hands: 'Easy',
      rotation: 2,
      night: 'Fill the tortillas with shredded chicken and cheese, crisp in a dry pan. Heat the soup.',
      prep: 'Roast and shred the chicken breast (oil, salt, 400°F / 205°C, 25 min).',
      items: [i('Chicken breast', '1.5 lb', M), i('Large tortillas', '8', Y), i('Shredded cheese', '8 oz', D), i('Tomato soup', '2 cans', Y)]
    },
    {
      id: 'shrimp-pasta',
      name: 'Garlic Shrimp Pasta with Peas',
      time: '20 min',
      hands: 'Hands-on',
      rotation: 2,
      night: 'Boil the pasta, adding frozen peas for the last 2 min. Sizzle shrimp in butter and garlic, toss everything with a splash of pasta water and lemon.',
      prep: 'Move the frozen shrimp to the fridge the night before to thaw.',
      items: [i('Frozen shrimp', '1 lb', F), i('Spaghetti', '1 lb', Y), i('Peas', '1 bag', F), i('Garlic', '1 head', P), i('Lemons', '2', P), i('Butter', '', D)]
    },
    {
      id: 'breakfast-dinner',
      name: 'Breakfast for Dinner',
      time: '15 min',
      hands: 'Easy',
      rotation: 2,
      night: 'Scrambled eggs with peppers and cheese, toast, sausages if you have them, a bowl of fruit on the table.',
      prep: 'Cut the bell peppers.',
      items: [i('Eggs', '12', D), i('Bell peppers', '3', P), i('Shredded cheese', '4 oz', D), i('Sandwich bread', '1 loaf', Y), i('Breakfast sausages', '1 pack', M), i('Fruit for the table', '', P)]
    },
    {
      id: 'teriyaki-bowls',
      name: 'Teriyaki Chicken Rice Bowls',
      time: '20 min',
      hands: 'Easy',
      rotation: 2,
      night: 'Warm shredded chicken in teriyaki sauce. Serve over rice with steamed broccoli and sesame seeds.',
      prep: 'Roast and shred the chicken breast; cook the rice.',
      items: [i('Chicken breast', '1.5 lb', M), i('Long-grain rice', '1 lb', Y), i('Teriyaki sauce', '1 bottle', Y), i('Broccoli', '1 head', P), i('Sesame seeds', '', Y)]
    },
    {
      id: 'chili-mac',
      name: 'One-Pot Chili Mac',
      time: '30 min',
      hands: 'One pot',
      rotation: 3,
      night: 'Brown beef and onion in a big pot, add chili powder, crushed tomatoes, beans, 2 cups stock and the dry macaroni. Simmer covered 12 min. Stir in cheese.',
      prep: 'Dice the onions.',
      items: [i('Ground beef', '1 lb', M), i('Onions', '1', P), i('Macaroni', '1 lb', Y), i('Crushed tomatoes', '1 can', Y), i('Kidney beans', '1 can', Y), i('Chicken stock', '1 qt', Y), i('Shredded cheese', '4 oz', D), i('Chili powder', '', Y)]
    },
    {
      id: 'sausage-sheetpan',
      name: 'Sheet-Pan Sausage, Peppers & Potatoes',
      time: '35 min',
      hands: 'Mostly oven',
      rotation: 3,
      night: 'Everything on one oiled sheet pan, 425°F / 220°C, 30 min, stir once.',
      prep: 'Cut the potatoes and peppers.',
      items: [i('Italian sausages', '1 lb', M), i('Bell peppers', '2', P), i('Potatoes', '2 lb', P), i('Olive oil', '', Y), i('Parchment or foil for sheet pans', '', O)]
    },
    {
      id: 'chicken-orzo',
      name: 'One-Pot Creamy Chicken & Orzo',
      time: '25 min',
      hands: 'One pot',
      rotation: 3,
      night: 'Sear the chicken pieces, add orzo, stock and spinach, simmer 12 min, finish with cream and parmesan.',
      prep: 'Cut the chicken into bite-size pieces.',
      items: [i('Bone-in chicken thighs', '1.5 lb', M), i('Orzo', '1 lb', Y), i('Chicken stock', '1 qt', Y), i('Spinach', '1 bag', P), i('Heavy cream', '1 small', D), i('Parmesan', '', D)]
    },
    {
      id: 'fish-tacos',
      name: 'Sheet-Pan Fish Tacos',
      time: '20 min',
      hands: 'Mostly oven',
      rotation: 3,
      night: 'Bake the cod with cumin and lime, 400°F / 205°C, 12 min. Flake into warm tortillas with slaw and sour cream.',
      prep: 'Shred the cabbage slaw; dress it the morning of.',
      items: [i('Cod fillets', '4', M), i('Small tortillas', '12', Y), i('Cabbage', '1', P), i('Limes', '2', P), i('Sour cream', '1 tub', D), i('Cumin', '', Y)]
    },
    {
      id: 'fried-rice-big',
      name: 'Big Skillet Fried Rice',
      time: '20 min',
      hands: 'Clean-out night',
      rotation: 3,
      night: 'Day-old rice, frozen mixed veg, scrambled egg, soy sauce, and anything left in the fridge.',
      prep: 'Cook the rice early in the week so it dries out — fresh rice goes gluey.',
      items: [i('Long-grain rice', '1 lb', Y), i('Mixed vegetables', '1 bag', F), i('Eggs', '4', D), i('Soy sauce', '', Y)]
    },
    {
      id: 'bean-burritos',
      name: 'Baked Bean & Cheese Burritos',
      time: '30 min',
      hands: 'Makes extra to freeze',
      rotation: 4,
      night: 'Mash refried beans with cumin, roll with rice and cheese, bake seam-down 400°F / 205°C for 15 min. Freeze the spares.',
      prep: 'Cook the rice.',
      items: [i('Refried beans', '2 cans', Y), i('Large tortillas', '10', Y), i('Long-grain rice', '1 lb', Y), i('Shredded cheese', '8 oz', D), i('Cumin', '', Y), i('Foil', '', O)]
    },
    {
      id: 'lentil-pie',
      name: 'Lentil Shepherd’s Pie',
      time: '45 min',
      hands: 'Mostly oven',
      rotation: 4,
      night: 'Simmer lentils with carrot, onion and tomato paste, top with mashed potato, bake 25 min until the top browns.',
      prep: 'Boil and mash the potatoes — this is the slow part, so do it on prep day.',
      items: [i('Brown lentils', '1 lb', Y), i('Potatoes', '3 lb', P), i('Carrots', '3', P), i('Onions', '1', P), i('Tomato paste', '1 tube', Y), i('Butter', '', D), i('Milk', '', D)]
    },
    {
      id: 'egg-fried-rice',
      name: 'Egg Fried Rice',
      time: '15 min',
      hands: 'Easy',
      rotation: 4,
      night: 'Leftover rice, frozen peas and carrots, three scrambled eggs, soy sauce, a little sesame oil.',
      prep: 'None — this one runs on rice you already cooked.',
      items: [i('Long-grain rice', '1 lb', Y), i('Eggs', '6', D), i('Peas and carrots', '1 bag', F), i('Soy sauce', '', Y), i('Sesame oil', '', Y)]
    },
    {
      id: 'pasta-fagioli',
      name: 'Pasta e Fagioli',
      time: '30 min',
      hands: 'One pot',
      rotation: 4,
      night: 'Soften onion, carrot and celery, add crushed tomatoes, white beans, stock and small pasta. Simmer until the pasta is done. Parmesan on top.',
      prep: 'Dice the soup vegetables all at once.',
      items: [i('Onions', '1', P), i('Carrots', '2', P), i('Celery', '1 bunch', P), i('Crushed tomatoes', '1 can', Y), i('White beans', '2 cans', Y), i('Small pasta', '1 lb', Y), i('Vegetable stock', '1 qt', Y), i('Parmesan', '', D)]
    },
    {
      id: 'roast-thighs-cabbage',
      name: 'Roast Chicken Thighs with Cabbage & Carrots',
      time: '40 min',
      hands: 'Mostly oven',
      rotation: 4,
      night: 'Thighs skin-side up on a bed of wedged cabbage and carrots, oil, salt, 425°F / 220°C, 35 min. The chicken fat does the seasoning.',
      prep: 'Wedge the cabbage, peel the carrots.',
      items: [i('Bone-in chicken thighs', '2.5 lb', M), i('Cabbage', '1', P), i('Carrots', '6', P), i('Olive oil', '', Y)]
    }
  ];

  /* ------------------------------------------------------------ quantities */

  // "2.5 lb" -> {num: 2.5, unit: "lb"}; "12" -> {num: 12, unit: ""}; "" -> null
  function parseQty(q) {
    if (!q) return null;
    var m = /^\s*(\d+(?:\.\d+)?)\s*(.*?)\s*$/.exec(q);
    if (!m) return { num: null, unit: q.trim() };
    return { num: parseFloat(m[1]), unit: m[2] || '' };
  }

  function fmtNum(n) {
    var r = Math.round(n * 100) / 100;
    return String(r);
  }

  // Plural-ish units: "2 cans" from "1 can". Only for the handful we use.
  var PLURALS = { can: 'cans', ball: 'balls', loaf: 'loaves', packet: 'packets', pack: 'packs', tub: 'tubs', head: 'heads', bunch: 'bunches', bag: 'bags', bottle: 'bottles', tube: 'tubes' };
  var SINGULARS = {};
  Object.keys(PLURALS).forEach(function (k) { SINGULARS[PLURALS[k]] = k; });

  function normUnit(u) { return SINGULARS[u] || u; }

  function unitFor(unit, num) {
    var base = normUnit(unit);
    if (num > 1 && PLURALS[base]) return PLURALS[base];
    return base;
  }

  /*
   * Merge the ingredient lists of the chosen dinners.
   * Same name + section -> one line. Same unit -> quantities add up.
   * Different units -> both shown, joined, rather than silently fudged.
   * Returns [{section, items: [{name, qty, forDinners: [names]}]}] in SECTIONS order.
   */
  function buildList(dinners) {
    var byKey = {};
    var order = [];
    dinners.forEach(function (d) {
      d.items.forEach(function (it) {
        var key = it.section + '|' + it.name.toLowerCase();
        if (!byKey[key]) {
          byKey[key] = { name: it.name, section: it.section, qtys: [], forDinners: [] };
          order.push(key);
        }
        var e = byKey[key];
        if (it.qty) e.qtys.push(it.qty);
        if (e.forDinners.indexOf(d.name) === -1) e.forDinners.push(d.name);
      });
    });

    var lines = order.map(function (key) {
      var e = byKey[key];
      return { name: e.name, section: e.section, qty: sumQtys(e.qtys), forDinners: e.forDinners };
    });

    return SECTIONS.map(function (s) {
      return {
        section: s,
        items: lines.filter(function (l) { return l.section === s; })
                    .sort(function (a, b) { return a.name.localeCompare(b.name); })
      };
    }).filter(function (g) { return g.items.length > 0; });
  }

  function sumQtys(qtys) {
    if (!qtys.length) return '';
    var groups = {};
    var gOrder = [];
    qtys.forEach(function (q) {
      var p = parseQty(q);
      if (!p) return;
      var u = normUnit(p.unit);
      if (!groups[u]) { groups[u] = { num: 0, unit: u, bad: [] }; gOrder.push(u); }
      if (p.num === null) groups[u].bad.push(q);
      else groups[u].num += p.num;
    });
    var parts = gOrder.map(function (u) {
      var g = groups[u];
      if (g.num === 0 && g.bad.length) return g.bad.join(' + ');
      var unit = unitFor(g.unit, g.num);
      return fmtNum(g.num) + (unit ? ' ' + unit : '');
    });
    return parts.join(' + ');
  }

  /*
   * The Sunday prep block: the deduplicated prep notes for the chosen dinners,
   * minus the "nothing to do" ones.
   */
  function buildPrep(dinners) {
    var seen = {};
    var out = [];
    dinners.forEach(function (d) {
      var t = d.prep;
      if (!t) return;
      if (/^(nothing|none)\b/i.test(t)) return;
      var k = t.toLowerCase();
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ text: t, dinner: d.name });
    });
    return out;
  }

  function byId(id) {
    for (var k = 0; k < DINNERS.length; k++) if (DINNERS[k].id === id) return DINNERS[k];
    return null;
  }

  return {
    SECTIONS: SECTIONS,
    DINNERS: DINNERS,
    parseQty: parseQty,
    sumQtys: sumQtys,
    buildList: buildList,
    buildPrep: buildPrep,
    byId: byId,
    MAX: 5
  };
});
