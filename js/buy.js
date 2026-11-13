/*
 * buy.js — single place the checkout URL lives.
 *
 * Until BUY_URL is filled in, every "buy" link points at the #price section and
 * a short honest note explains that card checkout is not switched on yet.
 * Paste the Stripe payment link below and redeploy: the links rewire themselves
 * and the note disappears. No tracking, no third-party scripts.
 */
(function () {
  'use strict';

  var BUY_URL = ''; // <-- Stripe payment link goes here

  if (!BUY_URL) return;

  var links = document.querySelectorAll('a.js-buy');
  for (var i = 0; i < links.length; i++) {
    links[i].setAttribute('href', BUY_URL);
    links[i].setAttribute('rel', 'noopener');
  }
  var notes = document.querySelectorAll('[data-buy-pending]');
  for (var j = 0; j < notes.length; j++) {
    notes[j].hidden = true;
  }
})();
