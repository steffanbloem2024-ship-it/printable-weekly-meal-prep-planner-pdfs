/*
 * print-btn.js — turns any [data-print] link into a print button.
 *
 * Without JavaScript the link still works: it is an ordinary anchor to #sheet,
 * so it jumps to the printable part of the page and the browser's own Print
 * command does the rest. No tracking, no dependencies.
 */
(function () {
  'use strict';
  var els = document.querySelectorAll('[data-print]');
  for (var i = 0; i < els.length; i++) {
    els[i].addEventListener('click', function (e) {
      e.preventDefault();
      window.print();
    });
  }
})();
