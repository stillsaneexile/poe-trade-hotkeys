'use strict';

/*
 * Mappings for hotkeys. Note that we want to avoid both JavaScript
 * KeyboardEvent.code and KeyboardEvent.keyCode (deprecated) due to the
 * international audience of PoE. KeyboardEvent.key will represent the actual
 * key typed in across QWERTY, AZERTY, etc.
 *
 * See: https://developers.google.com/web/updates/2016/04/keyboardevent-keys-codes
 */
const Keys = {
  COLON: ':',
  EQUALS: '=',
  FSLASH: '/',
  QUESTION: '?',
  SEMICOLON: ';',
  LBRACKET: '[',
};

// Event target tag names for which certain hotkey events should be ignored. This
// prevents hotkeys from triggering while typing in a box, for example.
// TODO: This might not be needed depending on the set of hotkeys we use.
const IGNORE_HOTKEY_TARGETS = new Set(['input', 'textarea', 'select']);

const Selectors = {
  MAIN_SEARCH: '.search-left input',
  // Using '.brown' to select the right-hand part of the pane isn't optimal,
  // but it seems to be the only distinguishing factor available.
  ADD_STAT_FILTER: '.search-advanced-pane.brown .filter-group-body input.multiselect__input',
  SHOW_HIDE_FILTERS: '.toggle-search-btn',
  FILTERS_HIDDEN: '.search-advanced-hidden',
  CLEAR_BUTTON: '.clear-btn',
  HELP_BOX: '.extension-help-box',
  // The only reason we need this is because the tab order on the site is
  // totally messed up. After adding a stat filter, you have to shift+tab
  // three times to get back to min.
  STAT_FILTER_MINMAX: '.search-advanced-pane.brown .filter-group-body input.minmax'
};

const HELP_BOX_HTML = `
  <div class=${Selectors.HELP_BOX.replace('.', '')}>
  <b>/</b> &nbsp;&nbsp; focus search box</br>
  <b>=</b> &nbsp;&nbsp; clear all search params</br>
  <b>;</b> &nbsp;&nbsp; add stat filter (supports filter groups)</br>
  <b>[</b> &nbsp;&nbsp; previous stat filter min</br>
  <b>?</b> &nbsp;&nbsp; toggle help box</br>
  </br>
  <b>Example</b>
    <ul>
      <li> <b>/</b>opal ring (then select Opal Ring with arrows)</li>
      <li> <b>;</b>maximum life (then select maximum life)</li>
      <li> <b>[</b>70 <b>tab</b> 90</li>
      <li> <b>;</b>elemental damage with attacks</li>
      <li> and so on...</li>
    </ul>
  </div>
  `;

/*
 * A class encapsulating the trade page and possible actions.
 */
class TradePage {
  focusSearch() {
    document.querySelector(Selectors.MAIN_SEARCH).focus();
  }

  focusAddStatFilter(target) {
    let filters = document.querySelectorAll(Selectors.ADD_STAT_FILTER);

    // The logic below cycles through stat filters. The order of occurrences in
    // the loop is very important. If no filters are focused, it selects the
    // first. If a filter is already focused, it selects the next (wrapping).
    this.maybeShowFilters();
    var focusTarget = filters[0];
    var statFilterAlreadyFocused = false;
    for (const statFilter of filters) {
      if (statFilterAlreadyFocused) {
        focusTarget = statFilter;
      }

      if (target.isSameNode(statFilter)) {
        statFilterAlreadyFocused = true;
      }
    }
    focusTarget.focus();
  }

  toggleHelp() {
    var helpBox = document.querySelector(Selectors.HELP_BOX);

    // Hide the help box if it exists.
    if (helpBox) {
      helpBox.parentElement.outerHTML = '';
      return;
    }

    helpBox = document.createElement('div');
    helpBox.innerHTML = HELP_BOX_HTML;
    document.body.appendChild(helpBox);
  }

  clear() {
    document.querySelector(Selectors.CLEAR_BUTTON).click();
    // If the search box is already selected, the PoE code actually doesn't
    // clear the box, so we do it manually...
    document.querySelector(Selectors.MAIN_SEARCH).value = '';
    this.focusSearch();
  }

  maybeShowFilters() {
    if (document.querySelector(Selectors.FILTERS_HIDDEN)) {
      document.querySelector(Selectors.SHOW_HIDE_FILTERS).click();
    }
  }

 lastMinStatFilter(target) {
   // Unfortunately, there's no way to distinguish min/max box except
   // placeholder (not locale agnostic). We use the fact that the classes come
   // in pairs of twos; presumably the "min" box is the first of the pair.
   let minMaxStatFilters = document.querySelectorAll(Selectors.STAT_FILTER_MINMAX);
   if (minMaxStatFilters.length == 0) {
     return;
   }

   // First check if any of the min OR max stat filters are selected. If they
   // are, then we jump to the previous one. Otherwise, default to last.
   var indexToFocus = minMaxStatFilters.length - 2;
   for (let i = 0; i < minMaxStatFilters.length; ++i) {
     if (target.isSameNode(minMaxStatFilters[i])) {
       // Find the previous min filter.
       if (i % 2 == 0) {
         indexToFocus = i - 2;
       } else {
         indexToFocus = i - 3;
       }
     }
   }
   // Implement wraparound logic.
   if (indexToFocus < 0) {
     indexToFocus = minMaxStatFilters.length + indexToFocus;
   }
   minMaxStatFilters[indexToFocus].focus();
 }

}

let tradePage = new TradePage();
// Use onkeydown instead of onkeyup to catch the event before it types into an
// input. This disallows the user from using these keys in text boxes. If we
// want to add 'ambiguous' hotkeys later, those should be handled in an separate
// event handler.
document.onkeydown = function(e) {
  switch (e.key) {
    case Keys.FSLASH:
      tradePage.focusSearch();
      break;
    case Keys.QUESTION:
      tradePage.toggleHelp();
      break;
    case Keys.SEMICOLON:
      tradePage.focusAddStatFilter(e.target);
      break;
    case Keys.EQUALS:
      tradePage.clear();
      break;
    case Keys.LBRACKET:
      tradePage.lastMinStatFilter(e.target);
    default:
      return;
  }
  e.preventDefault();
  return false;
}
