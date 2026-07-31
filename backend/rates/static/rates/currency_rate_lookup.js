/*
 * Currency add/change form: as soon as staff finish typing a 3-letter code, look up its market
 * rate and show it as a suggestion next to buy_rate/sell_rate. Purely informational — nothing is
 * written to the form until staff click "Use suggestion", same "guidance, not a price" rule as
 * the read-only Market ref column in the Currency changelist.
 *
 * Vanilla JS, no build step, loaded only on this admin's add/change page via CurrencyAdmin.Media.
 */
(function () {
  'use strict';

  function lookupUrl() {
    // This script only loads on the Currency add/change page, so the current path is always
    // either .../rates/currency/add/ or .../rates/currency/<pk>/change/ — swap either for the
    // sibling URL CurrencyAdmin.get_urls() registers, rather than hardcoding an absolute path
    // that would break if the admin were ever mounted somewhere else.
    return window.location.pathname.replace(/(add|\d+\/change)\/?$/, 'lookup-rate/');
  }

  function renderBox(container, html) {
    container.innerHTML = html;
    container.style.display = 'block';
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var codeField = document.getElementById('id_code');
    var buyField = document.getElementById('id_buy_rate');
    var sellField = document.getElementById('id_sell_rate');
    if (!codeField || !buyField || !sellField) return;

    var box = document.createElement('div');
    box.id = 'currency-rate-suggestion';
    box.style.cssText = 'display:none;margin-top:8px;padding:10px 14px;border-radius:6px;' +
      'font-size:13px;background:#000;color:#fff;max-width:520px;';
    codeField.closest('.form-row, .field-code').appendChild(box);

    var lastRequested = '';

    function runLookup() {
      var code = codeField.value.trim().toUpperCase();
      if (code.length !== 3 || code === lastRequested) return;
      lastRequested = code;

      renderBox(box, 'Checking market rate for ' + escapeHtml(code) + '…');

      fetch(lookupUrl() + '?code=' + encodeURIComponent(code), { credentials: 'same-origin' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (code !== codeField.value.trim().toUpperCase()) return; // stale response, field changed since

          if (!data.ok) {
            renderBox(box, '<span style="color:#ff8a80">' + escapeHtml(data.error) + '</span>');
            return;
          }

          renderBox(
            box,
            'Market rate for ' + escapeHtml(data.code) + ': <strong>₹' + escapeHtml(data.rate) +
            '</strong> (via ' + escapeHtml(data.source) + '). Suggested — Buy: ₹' +
            escapeHtml(data.suggested_buy) + ' · Sell: ₹' + escapeHtml(data.suggested_sell) +
            ' <button type="button" id="currency-rate-suggestion-apply" class="button" ' +
            'style="margin-left:8px;background:#fff;color:#000;border:1px solid #fff" ' +
            'data-buy="' + escapeHtml(data.suggested_buy) +
            '" data-sell="' + escapeHtml(data.suggested_sell) + '">Use suggestion</button>'
          );

          var applyBtn = document.getElementById('currency-rate-suggestion-apply');
          if (applyBtn) {
            applyBtn.addEventListener('click', function () {
              buyField.value = applyBtn.getAttribute('data-buy');
              sellField.value = applyBtn.getAttribute('data-sell');
            });
          }
        })
        .catch(function () {
          renderBox(box, '<span style="color:#a4322a">Could not reach the lookup endpoint.</span>');
        });
    }

    codeField.addEventListener('blur', runLookup);
  });
})();
