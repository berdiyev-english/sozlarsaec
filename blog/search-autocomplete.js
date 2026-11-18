/* Live article-title suggestions for the BeWords journal search. */
(function () {
  'use strict';

  var forms = Array.prototype.slice.call(document.querySelectorAll('.nav-search'));
  if (!forms.length || !window.fetch) return;

  var indexPromise = null;
  var maxSuggestions = 6;

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/gi, ' ')
      .trim();
  }

  function loadIndex() {
    if (!indexPromise) {
      var url = new URL('search-index.json', window.location.href);
      indexPromise = window.fetch(url.toString(), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Search index request failed: ' + response.status);
          return response.json();
        })
        .then(function (items) {
          if (!Array.isArray(items)) throw new Error('Search index has an unexpected format.');
          return items;
        })
        .catch(function (error) {
          indexPromise = null;
          throw error;
        });
    }
    return indexPromise;
  }

  function rankMatches(items, query) {
    var tokens = query.split(/\s+/).filter(Boolean);
    return items.map(function (item, sourceIndex) {
      var title = normalize(item.title);
      var category = normalize(item.category);
      var summary = normalize(item.summary);
      var searchable = normalize([item.title, item.category, item.summary, item.search].join(' '));
      if (!tokens.every(function (token) { return searchable.indexOf(token) !== -1; })) return null;

      var score = 0;
      tokens.forEach(function (token) {
        if (title.indexOf(token) !== -1) score += 24;
        else if (category.indexOf(token) !== -1) score += 12;
        else if (summary.indexOf(token) !== -1) score += 7;
        else score += 2;
      });
      if (title === query) score += 60;
      else if (title.indexOf(query) === 0) score += 36;
      else if (title.indexOf(query) !== -1) score += 18;
      return { item: item, score: score, sourceIndex: sourceIndex };
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || a.sourceIndex - b.sourceIndex;
    });
  }

  forms.forEach(function (form) {
    var input = form.querySelector('input[name="q"]');
    var listbox = form.querySelector('.nav-search-suggestions');
    var help = form.querySelector('.nav-search-help');
    if (!input || !listbox) return;

    var defaultHelp = help ? help.textContent : '';
    var matches = [];
    var activeIndex = -1;
    var requestNumber = 0;

    function setHelp(message) {
      if (help && message) help.textContent = message;
      else if (help && !message) help.textContent = defaultHelp;
    }

    function closeSuggestions() {
      listbox.hidden = true;
      listbox.replaceChildren();
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      matches = [];
      activeIndex = -1;
    }

    function setActive(index) {
      var options = Array.prototype.slice.call(listbox.querySelectorAll('[role="option"]'));
      if (!options.length) return;
      activeIndex = (index + options.length) % options.length;
      options.forEach(function (option, optionIndex) {
        var selected = optionIndex === activeIndex;
        option.setAttribute('aria-selected', String(selected));
        if (selected) input.setAttribute('aria-activedescendant', option.id);
      });
      if (options[activeIndex].scrollIntoView) options[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function renderSuggestions(rawQuery, initialSelection) {
      var query = normalize(rawQuery);
      var currentRequest = ++requestNumber;
      if (!query) {
        closeSuggestions();
        setHelp('');
        return;
      }
      if (query.length < 2) {
        closeSuggestions();
        setHelp('Введите хотя бы две буквы — покажу подходящие названия статей.');
        return;
      }

      closeSuggestions();
      setHelp('Подбираю подходящие статьи…');
      loadIndex().then(function (items) {
        if (currentRequest !== requestNumber || normalize(input.value) !== query) return;
        var ranked = rankMatches(items, query);
        matches = ranked.slice(0, maxSuggestions).map(function (match) { return match.item; });
        if (!matches.length) {
          closeSuggestions();
          setHelp('Подходящих статей не нашлось. Нажмите «Найти», чтобы выполнить полный поиск.');
          return;
        }

        listbox.replaceChildren();
        matches.forEach(function (item, index) {
          var option = document.createElement('button');
          option.type = 'button';
          option.className = 'nav-search-suggestion';
          option.id = listbox.id + '-option-' + index;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');
          option.setAttribute('tabindex', '-1');
          option.setAttribute('data-suggestion-index', String(index));

          var title = document.createElement('span');
          title.className = 'nav-search-suggestion-title';
          title.textContent = item.title;
          var category = document.createElement('span');
          category.className = 'nav-search-suggestion-category';
          category.textContent = item.category;
          option.appendChild(title);
          option.appendChild(category);
          listbox.appendChild(option);
        });

        listbox.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        if (ranked.length > maxSuggestions) {
          setHelp('Показаны первые ' + maxSuggestions + ' из ' + ranked.length + ' статей. Нажмите «Найти» для полного списка.');
        } else {
          setHelp('Выберите название, чтобы открыть статью, или нажмите «Найти» для всех совпадений.');
        }
        if (initialSelection === 'first') setActive(0);
        else if (initialSelection === 'last') setActive(matches.length - 1);
      }).catch(function () {
        if (currentRequest !== requestNumber) return;
        closeSuggestions();
        setHelp('Не удалось загрузить подсказки. Нажмите «Найти», чтобы выполнить поиск.');
      });
    }

    input.addEventListener('input', function () {
      renderSuggestions(input.value, null);
    });
    input.addEventListener('focus', function () {
      if (input.value.trim()) renderSuggestions(input.value, null);
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (listbox.hidden) renderSuggestions(input.value, 'first');
        else setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        if (listbox.hidden) {
          event.preventDefault();
          renderSuggestions(input.value, 'last');
        } else {
          event.preventDefault();
          setActive(activeIndex < 0 ? matches.length - 1 : activeIndex - 1);
        }
      } else if (event.key === 'Enter' && !listbox.hidden && activeIndex >= 0) {
        event.preventDefault();
        var selected = matches[activeIndex];
        if (selected && selected.href) window.location.assign(selected.href);
      } else if (event.key === 'Escape' && !listbox.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeSuggestions();
        setHelp('');
      } else if (event.key === 'Tab') {
        closeSuggestions();
        setHelp('');
      }
    });

    listbox.addEventListener('click', function (event) {
      var option = event.target.closest('[data-suggestion-index]');
      if (!option) return;
      var selected = matches[Number(option.getAttribute('data-suggestion-index'))];
      if (selected && selected.href) window.location.assign(selected.href);
    });

    form.addEventListener('submit', closeSuggestions);
    document.addEventListener('pointerdown', function (event) {
      if (!form.contains(event.target)) closeSuggestions();
    });
    document.addEventListener('focusin', function (event) {
      if (!form.contains(event.target)) closeSuggestions();
    });
  });
})();
