/*
 * Currency add/change form: as soon as staff finish typing a 3-letter code, look up its market
 * rate and show it as a suggestion next to buy_rate/sell_rate. Purely informational — nothing is
 * written to the form until staff click "Use suggestion", same "guidance, not a price" rule as
 * the read-only Market ref column in the Currency changelist.
 *
 * Vanilla JS, no build step, loaded only on this admin's add/change page via CurrencyAdmin.Media.
 *
 * Deliberately defensive: everything that touches the DOM is wrapped so one unexpected selector
 * miss (a future Django admin template change, a custom admin theme) logs to the console instead
 * of silently killing the whole script before the event listeners below it ever get attached.
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
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function findInsertionPoint(codeField) {
    // .closest() can come back null if the admin's markup ever changes (a template update, a
    // custom admin theme) — chain a few fallbacks so there is always *somewhere* to put the box,
    // rather than throwing and silently aborting every listener registered after this point.
    return codeField.closest('.form-row, .field-code')
      || codeField.parentElement
      || codeField.parentNode;
  }

  function init() {
    var codeField = document.getElementById('id_code');
    var buyField = document.getElementById('id_buy_rate');
    var sellField = document.getElementById('id_sell_rate');
    // These three are optional — name/country_code/region are known for a smaller table of
    // currencies (rates/currency_metadata.py) than the rate itself, and the change form's other
    // fields might not all be present on every future variant of this page. Rate suggestions
    // still work even if these are missing; only "Use suggestion" filling them is skipped.
    var nameField = document.getElementById('id_name');
    var countryField = document.getElementById('id_country_code');
    var regionField = document.getElementById('id_region');
    if (!codeField || !buyField || !sellField) return;

    var box = document.createElement('div');
    box.id = 'currency-rate-suggestion';
    box.style.cssText = 'display:none;margin-top:8px;padding:10px 14px;border-radius:6px;' +
      'font-size:13px;background:#000;color:#fff;max-width:520px;';

    var mount = findInsertionPoint(codeField);
    if (!mount) {
      console.error('currency_rate_lookup.js: could not find anywhere to attach the suggestion box.');
      return;
    }
    mount.appendChild(box);

    var lastRequested = '';
    var debounceTimer = null;

    function runLookup() {
      var code = codeField.value.trim().toUpperCase();
      if (code.length !== 3) {
        box.style.display = 'none';
        lastRequested = '';
        return;
      }
      if (code === lastRequested) return;
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

          var detailBits = [];
          if (data.name) detailBits.push(escapeHtml(data.name));
          if (data.country_code) detailBits.push(escapeHtml(data.country_code));
          if (data.region) detailBits.push(escapeHtml(data.region));
          var detailText = detailBits.length
            ? ' Also fills in: ' + detailBits.join(', ') + '.'
            : ' (Name/country/region not known for this code — only the rate will be filled.)';

          renderBox(
            box,
            'Market rate for ' + escapeHtml(data.code) + ': <strong>₹' + escapeHtml(data.rate) +
            '</strong> (via ' + escapeHtml(data.source) + '). Suggested — Buy: ₹' +
            escapeHtml(data.suggested_buy) + ' · Sell: ₹' + escapeHtml(data.suggested_sell) +
            ' <button type="button" id="currency-rate-suggestion-apply" class="button" ' +
            'style="margin-left:8px;background:#fff;color:#000;border:1px solid #fff" ' +
            'data-buy="' + escapeHtml(data.suggested_buy) +
            '" data-sell="' + escapeHtml(data.suggested_sell) +
            '" data-name="' + escapeHtml(data.name) +
            '" data-country="' + escapeHtml(data.country_code) +
            '" data-region="' + escapeHtml(data.region) +
            '">Use suggestion</button>' +
            '<div style="margin-top:4px;font-size:12px;opacity:.85">' + detailText + '</div>'
          );

          var applyBtn = document.getElementById('currency-rate-suggestion-apply');
          if (applyBtn) {
            applyBtn.addEventListener('click', function () {
              buyField.value = applyBtn.getAttribute('data-buy');
              sellField.value = applyBtn.getAttribute('data-sell');

              var name = applyBtn.getAttribute('data-name');
              if (name && nameField) nameField.value = name;

              var country = applyBtn.getAttribute('data-country');
              if (country && countryField) countryField.value = country;

              var region = applyBtn.getAttribute('data-region');
              if (region && regionField) {
                // <select> — only set it if the value actually matches one of the option values;
                // silently doing nothing is safer than leaving the field on an invalid selection.
                var matched = false;
                for (var i = 0; i < regionField.options.length; i++) {
                  if (regionField.options[i].value === region) { matched = true; break; }
                }
                if (matched) regionField.value = region;
              }
            });
          }
        })
        .catch(function (err) {
          renderBox(box, '<span style="color:#ff8a80">Could not reach the lookup endpoint.</span>');
          console.error('currency_rate_lookup.js: lookup failed', err);
        });
    }

    // Two triggers, not one: blur alone can be missed if staff type a code and click straight to
    // Save without ever leaving the field via a normal tab/click (the click that submits the form
    // also fires blur, but by then the page is already navigating away). Debounced typing catches
    // that case; blur is kept too so a click into a *different* field also refreshes it, e.g.
    // after correcting a typo.
    codeField.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runLookup, 400);
    });
    codeField.addEventListener('blur', runLookup);
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // DOMContentLoaded already fired by the time this script ran (e.g. loaded with `defer` in
      // some admin skins) — don't miss the event, just run immediately.
      init();
    }
  } catch (err) {
    console.error('currency_rate_lookup.js failed to initialise', err);
  }
})();
