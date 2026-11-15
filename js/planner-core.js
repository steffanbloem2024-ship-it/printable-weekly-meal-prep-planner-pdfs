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
      items: [i('Boneless chicken thighs', '1.5 lb', M), i('Orzo', '1 lb', Y), i('Chicken stock', '1 qt', Y), i('Spinach', '1 bag', P), i('Heavy cream', '1 small', D), i('Parmesan', '', D)]
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
  var PLURALS = { can: 'cans', ball: 'balls', loaf: 'loaves', packet: 'packets', pack: 'packs', tub: 'tubs', head: 'heads', bunch: 'bunches', bag: 'bags', bottle: 'bottles', tube: 'tubes', jar: 'jars', box: 'boxes', tin: 'tins', clove: 'cloves', slice: 'slices', cup: 'cups', sprig: 'sprigs', punnet: 'punnets', stick: 'sticks' };
  var SINGULARS = {};
  Object.keys(PLURALS).forEach(function (k) { SINGULARS[PLURALS[k]] = k; });

  /* People type units many ways. Fold the spellings onto one so "1 lb" and
     "2 lbs" add up instead of printing as "1 lb + 2 lbs". */
  var UNIT_ALIASES = {
    lbs: 'lb', pound: 'lb', pounds: 'lb',
    ounce: 'oz', ounces: 'oz', ozs: 'oz',
    gram: 'g', grams: 'g', grammes: 'g', gr: 'g',
    kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
    litre: 'l', litres: 'l', liter: 'l', liters: 'l',
    millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
    tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp',
    teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
    quart: 'qt', quarts: 'qt', pint: 'pt', pints: 'pt',
    pkt: 'packet', pkts: 'packet', pks: 'pack'
  };

  function normUnit(u) {
    var k = String(u == null ? '' : u).toLowerCase();
    if (UNIT_ALIASES[k]) return UNIT_ALIASES[k];
    return SINGULARS[k] || k;
  }

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

  /* ------------------------------------------------------------------------
   * Your own dinners: reading a typed ingredient list.
   *
   * A parent's real week is mostly their own dinners, not ours. So the tool has
   * to accept "Grandma's chicken soup — 1 whole chicken, 3 carrots, celery,
   * egg noodles" and fold it into the same merged, aisle-sorted list. That is
   * pure string work, which means it can be tested, so it lives here.
   * ---------------------------------------------------------------------- */

  var MAX_OWN_ITEMS = 25;

  // Units we recognise when they follow a number. Anything else after the
  // number is part of the ingredient name ("12 tortillas" -> qty 12).
  var UNIT_WORDS = {};
  ['lb', 'oz', 'g', 'kg', 'ml', 'l', 'qt', 'pt', 'cup', 'tbsp', 'tsp', 'dozen', 'sheet', 'sheets']
    .forEach(function (u) { UNIT_WORDS[u] = 1; });
  Object.keys(PLURALS).forEach(function (u) { UNIT_WORDS[u] = 1; UNIT_WORDS[PLURALS[u]] = 1; });
  Object.keys(UNIT_ALIASES).forEach(function (u) { UNIT_WORDS[u] = 1; });

  // "pantry: rice, soy sauce" puts a whole group in the aisle you name, so a
  // wrong guess is always the user's to overrule.
  var AISLE_WORDS = {
    'produce': P, 'veg': P, 'vegetables': P, 'fruit': P, 'fruit & veg': P, 'fruit and veg': P, 'fresh': P,
    'meat': M, 'fish': M, 'meat & fish': M, 'meat and fish': M, 'seafood': M, 'butcher': M,
    'dairy': D, 'eggs': D, 'dairy & eggs': D, 'dairy and eggs': D, 'fridge': D, 'chilled': D,
    'pantry': Y, 'dry': Y, 'dry goods': Y, 'pantry & dry goods': Y, 'cupboard': Y,
    'store cupboard': Y, 'baking': Y, 'bakery': Y, 'tins': Y, 'cans': Y,
    'frozen': F, 'freezer': F,
    'other': O, 'household': O, 'other / household': O, 'misc': O, 'drinks': O, 'cleaning': O
  };

  // Ingredients already in our own twenty dinners keep their aisle, so a typed
  // "cheddar" merges with our cheddar instead of starting a second line.
  var KNOWN = null;
  function knownSections() {
    if (KNOWN) return KNOWN;
    KNOWN = {};
    DINNERS.forEach(function (d) {
      d.items.forEach(function (it) { KNOWN[it.name.toLowerCase()] = it.section; });
    });
    return KNOWN;
  }

  // First match wins, so the specific rules come before the broad ones.
  var SECTION_RULES = [
    [/\bsalt( and | & )pepper\b|\bsalt\b/, Y],
    [/\bsoup\b/, Y],
    [/\bjuice\b/, O],
    [/\begg (noodles|pasta|rolls?)\b/, Y],
    [/\b(potato|corn|tortilla) chips\b/, Y],
    [/\bgarlic bread\b|\bflatbreads?\b/, Y],
    [/\b(black|white|cayenne|chilli|chili|red)\s+pepper\b|peppercorns?|pepper flakes/, Y],
    [/\bgarlic (powder|salt)\b|\bonion powder\b|\bdried \w+|\bground (cumin|coriander|cinnamon|ginger|nutmeg|pepper)\b/, Y],
    [/\btomato (paste|puree|passata|sauce)\b|\b(crushed|canned|tinned|chopped) tomatoes\b/, Y],
    [/\bcoconut milk\b|\bcurry (paste|powder)\b|\bstock\b|\bbroth\b|\bbouillon\b|\bgravy\b/, Y],
    [/\bfrozen\b|\bice cream\b|\bfish (sticks|fingers)\b|\boven chips\b|\bfrench fries\b/, F],
    [/\b(tofu|tempeh|seitan)\b/, P],
    [/\b(chicken|beef|pork|lamb|turkey|mince|steaks?|bacon|sausages?|ham|chorizo|pepperoni|meatballs?|thighs?|drumsticks?|breasts?|brisket|ribs|hot ?dogs?|salami|prosciutto|deli meat)\b/, M],
    [/\b(salmon|cod|tuna|haddock|tilapia|prawns?|shrimps?|fish|scallops?|mussels|crab|anchov\w*)\b/, M],
    [/\b(milk|cheeses?|cheddar|mozzarella|parmesan|feta|halloumi|ricotta|mascarpone|yogh?urt|butter|margarine|creams?|creme|custard|eggs?|paneer)\b/, D],
    [/\b(onions?|shallots?|garlic|potatoes?|potato|carrots?|celery|lettuce|romaine|spinach|kale|cabbage|broccoli|cauliflower|zucchini|courgettes?|cucumbers?|tomatoes?|tomato|peppers?|capsicum|mushrooms?|avocados?|lemons?|limes?|apples?|bananas?|oranges?|pears?|grapes|berries|strawberr\w*|blueberr\w*|raspberr\w*|melon|pineapple|mango|peach(es)?|plums?|ginger|herbs?|parsley|cilantro|coriander|basil|mint|dill|thyme|rosemary|scallions?|spring onions?|leeks?|green beans?|snap peas|asparagus|squash|aubergines?|eggplants?|beets?|radish\w*|corn on the cob|salad|coleslaw|sprouts|fruit|vegetables?|veg|peas|corn|sweetcorn)\b/, P],
    [/\b(pasta|spaghetti|penne|macaroni|noodles?|orzo|couscous|quinoa|rice|flour|sugar|oils?|vinegar|salt|spices?|paprika|cumin|oregano|cinnamon|beans?|lentils?|chickpeas|tortillas?|wraps?|bread|buns?|bagels?|pita|cereal|oats|granola|honey|syrup|peanut butter|jam|jelly|soy sauce|ketchup|mayo|mayonnaise|mustard|salsa|olives?|pickles?|crackers?|raisins?|nuts?|almonds?|cashews?|cocoa|baking \w+|yeast|tahini|hummus|seasoning|sauces?|canned \w+|tinned \w+|stuffing|breadcrumbs|gnocchi|polenta|dough|pastry|seeds|sesame|chil(?:i|li) powder|cornflour|cornstarch|stock cubes?)\b/, Y],
    [/\b(foil|parchment|baking paper|cling film|plastic wrap|zip ?lock|freezer bags?|bin bags?|trash bags?|paper towels?|kitchen roll|napkins?|dish ?soap|detergent|sponges?|wipes?|toilet \w+|batteries|soda|cola|lemonade|water|wine|beer|coffee|tea|dog food|cat food|nappies|diapers)\b/, O]
  ];

  /* The keyword rules on their own, with no help from our own ingredient
     list. Exported so the tests can hold the rule table up against 74 real
     ingredient names instead of only the ones it is told the answer to. */
  function rulesSection(name) {
    var n = String(name == null ? '' : name).toLowerCase().trim();
    if (!n) return O;
    for (var r = 0; r < SECTION_RULES.length; r++) {
      if (SECTION_RULES[r][0].test(n)) return SECTION_RULES[r][1];
    }
    return O;
  }

  function guessSection(name) {
    var n = String(name == null ? '' : name).toLowerCase().trim();
    if (!n) return O;
    var known = knownSections();
    if (known[n]) return known[n];
    return rulesSection(n);
  }

  var FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 };

  function tidyName(s) {
    var n = s.replace(/^of\s+/i, '').replace(/[\s.,;]+$/, '').replace(/\s+/g, ' ').trim();
    if (n.length > 44) n = n.slice(0, 44).replace(/\s+\S*$/, '');
    if (n) n = n.charAt(0).toUpperCase() + n.slice(1);
    return n;
  }

  /* One typed chunk -> {name, qty, section}, or null if there is nothing in it.
     "2 cans crushed tomatoes" -> {name:'Crushed tomatoes', qty:'2 cans', ...} */
  function parseItem(chunk, forcedSection) {
    var s = String(chunk == null ? '' : chunk)
      .replace(/^[\s\-–—*•·]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return null;

    var qty = '';
    var m = /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½¼¾⅓⅔])\s*([A-Za-z]{1,12})?\.?\s*(.*)$/.exec(s);
    if (m && m[3] !== undefined) {
      var num = null;
      if (FRACTIONS[m[1]]) num = FRACTIONS[m[1]];
      else {
        var raw = m[1].replace(',', '.');
        if (raw.indexOf('/') !== -1) {
          var f = raw.split('/');
          var a = parseFloat(f[0]), b = parseFloat(f[1]);
          if (b) num = Math.round((a / b) * 100) / 100;
        } else num = parseFloat(raw);
      }
      var unitWord = m[2] ? m[2].toLowerCase() : '';
      var rest = m[3];
      // "2 x chicken breasts" / "2 × eggs": the x is a multiplier, not a unit
      if (unitWord === 'x') { unitWord = ''; }
      rest = rest.replace(/^[\u00d7x]\s+/i, '');
      if (num !== null && !isNaN(num)) {
        if (unitWord && UNIT_WORDS[unitWord] && rest) {
          var u = normUnit(unitWord);
          qty = fmtNum(num) + ' ' + unitFor(u, num);
          s = rest;
        } else {
          // no unit, or the "unit" is really the start of the name
          qty = fmtNum(num);
          s = ((unitWord ? m[2] + ' ' : '') + rest).trim();
        }
      }
    }

    var name = tidyName(s);
    if (name.length < 2) return null;
    return { name: name, qty: qty, section: forcedSection || guessSection(name) };
  }

  /* A whole typed list. Lines (or semicolons) separate groups, commas separate
     items, and a line may start with an aisle name to place its items:
     "produce: 3 carrots, celery, 1 onion". Returns [{name, qty, section}]. */
  function parseIngredients(text) {
    var out = [];
    if (!text) return out;
    String(text).split(/[\n;]+/).forEach(function (line) {
      var forced = null;
      var am = /^\s*([A-Za-z&/ ]{3,24}?)\s*:\s*(.*)$/.exec(line);
      if (am) {
        var key = am[1].toLowerCase().replace(/\s+/g, ' ').trim();
        if (AISLE_WORDS[key]) { forced = AISLE_WORDS[key]; line = am[2]; }
      }
      line.split(',').forEach(function (chunk) {
        if (out.length >= MAX_OWN_ITEMS) return;
        var it = parseItem(chunk, forced);
        if (it) out.push(it);
      });
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
    guessSection: guessSection,
    rulesSection: rulesSection,
    parseItem: parseItem,
    parseIngredients: parseIngredients,
    AISLE_WORDS: AISLE_WORDS,
    MAX_OWN_ITEMS: MAX_OWN_ITEMS,
    MAX: 5
  };
});
