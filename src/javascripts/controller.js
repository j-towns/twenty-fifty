(function() {

  views = {};
  controller = null;
  choices = null;
  view = null;
  sector = null;
  comparator = null;
  view_manager = null;
  old_choices = [];
  cache = {};
  windowResizeDebounceTimer = null;

  documentReady = function() {
    checkSVGWorks();
    setUpControls();
    setVariablesFromURL();
    switchView(view);
    loadMainPathway();
  };

  $(document).ready(documentReady);

  checkSVGWorks = function() {
    if (!!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect) {
      return true;
    }
    return $("#svgWarn").show();
  };

  setUpControls = function() {
    $("a[title]").tooltip({
      delay: 0,
      position: 'top left',
      offset: [3, 3],
      tip: '#tooltip'
    });
    $("a.choiceLink").click(function(event) {
      var c, l, t;
      event.preventDefault();
      t = $(event.target);
      c = t.data().choicenumber;
      l = t.data().choicelevel;
      return go(c, l);
    });
    $("a.view").click(function(event) {
      var t, v;
      event.preventDefault();
      t = $(event.target);
      v = t.data().view;
      return switchView(v);
    });
    $(".newdropdown").click(function(event) {
      var d, o, space, t;
      event.preventDefault();
      t = $(event.target);
      d = $(t.data().dropdown);
      if (d.hasClass("showdropdown")) {
        return d.removeClass("showdropdown");
      } else {
        d.addClass("showdropdown");
        o = t.offset();
        o.top = o.top + t.height();
        space = $(document).width() - o.left - d.width();
        if (space < 0) {
          o.left = o.left + space;
        }
        return d.offset(o);
      }
    });

    // This triggers the interface to loop through levels 1 to 4
    // when the user hovers their mouse over a choice.
    d3.selectAll('td.name a')
      .datum(function() { return this.dataset })
      .on('mouseover', function(d,i) { startDemo(d.choicenumber); })
      .on('mouseout', function(d,i) { stopDemo(d.choicenumber); })

    $(window).resize(function(event) {
      clearTimeout(windowResizeDebounceTimer);
      return windowResizeDebounceTimer = setTimeout(function() {
        return view_manager.updateResults(cache[codeForChoices()]);
      }, 500);
    });
  };

  setVariablesFromURL = function() {
    var url_elements;
    url_elements = window.location.pathname.split('/');
    controller = url_elements[1] || "pathways";
    choices = choicesForCode(url_elements[2] || twentyfifty.default_pathway);
    view = url_elements[3] || "primary_energy_chart";
    if (view === 'costs_compared_within_sector') {
      sector = url_elements[4];
    }
    if (url_elements[4] === 'comparator') {
      return comparator = url_elements[5];
    }
  };

  float_to_letter_map = {
    "": "0",
    1.0: "1",
    1.1: "b",
    1.2: "c",
    1.3: "d",
    1.4: "e",
    1.5: "f",
    1.6: "g",
    1.7: "h",
    1.8: "i",
    1.9: "j",
    2.0: "2",
    2.1: "l",
    2.2: "m",
    2.3: "n",
    2.4: "o",
    2.5: "p",
    2.6: "q",
    2.7: "r",
    2.8: "s",
    2.9: "t",
    3.0: "3",
    3.1: "v",
    3.2: "w",
    3.3: "x",
    3.4: "y",
    3.5: "z",
    3.6: "A",
    3.7: "B",
    3.8: "C",
    3.9: "D",
    0.0: "0",
    4.0: "4"
  };

  codeForChoices = function(c) {
    var cd, choice;
    if (c == null) {
      c = choices;
    }
    cd = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = c.length; _i < _len; _i++) {
        choice = c[_i];
        _results.push(float_to_letter_map[choice]);
      }
      return _results;
    })();
    return cd.join('');
  };

  letter_to_float_map = {
    "1": 1.0,
    "b": 1.1,
    "c": 1.2,
    "d": 1.3,
    "e": 1.4,
    "f": 1.5,
    "g": 1.6,
    "h": 1.7,
    "i": 1.8,
    "j": 1.9,
    "2": 2.0,
    "l": 2.1,
    "m": 2.2,
    "n": 2.3,
    "o": 2.4,
    "p": 2.5,
    "q": 2.6,
    "r": 2.7,
    "s": 2.8,
    "t": 2.9,
    "3": 3.0,
    "v": 3.1,
    "w": 3.2,
    "x": 3.3,
    "y": 3.4,
    "z": 3.5,
    "A": 3.6,
    "B": 3.7,
    "C": 3.8,
    "D": 3.9,
    "0": 0.0,
    "4": 4.0
  };

  choicesForCode = function(newCode) {
    var choice, _i, _len, _ref, _results;
    _ref = newCode.split('');
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      choice = _ref[_i];
      _results.push(letter_to_float_map[choice]);
    }
    return _results;
  };

  url = function(options) {
    var s;
    if (options == null) {
      options = {};
    }
    s = jQuery.extend({
      controller: controller,
      code: codeForChoices(),
      view: view,
      sector: sector,
      comparator: getComparator()
    }, options);
    if (s.view === 'costs_compared_within_sector' && (s.sector != null)) {
      return "/" + s.controller + "/" + s.code + "/" + s.view + "/" + s.sector;
    } else if (s.comparator != null) {
      return "/" + s.controller + "/" + s.code + "/" + s.view + "/comparator/" + s.comparator;
    } else {
      return "/" + s.controller + "/" + s.code + "/" + s.view;
    }
  };

  go = function(index, level) {
    old_choices = choices.slice(0);
    if (index <= 15 && index !== 3 && level > 1 && Math.ceil(choices[index]) === level) {
      choices[index] = Math.round((choices[index] - 0.1) * 10) / 10;
    } else {
      choices[index] = level;
    }
    return loadMainPathway();
  };

  demoTimer = null;

  demoOriginalLevel = null;

  startDemo = function(choice) {
    var demoLevel, demoMaximum;
    demoLevel = 1;
    demoOriginalLevel = choices[choice];
    demoMaximum = window.twentyfifty.choice_sizes[choice];
    return demoTimer = setInterval((function() {
      go(choice, demoLevel);
      demoLevel = demoLevel + 1;
      if (demoLevel > demoMaximum) {
        demoLevel = 1;
      }
      return false;
    }), 1000);
  };

  stopDemo = function(choice) {
    if (demoTimer != null) {
      clearInterval(demoTimer);
    }
    if ((demoOriginalLevel != null) && demoOriginalLevel !== choices[choice]) {
      return go(choice, demoOriginalLevel);
    }
  };

  switchView = function(new_view) {
    var c, data;
    $('.showdropdown').removeClass("showdropdown");
    if (view === new_view && (view_manager != null)) {
      return false;
    }
    if (view_manager != null) {
      view_manager.teardown();
    }
    view = new_view;
    view_manager = views[view];
    $("a.selectedView").removeClass("selectedView");
    $("a.view[data-view='" + view + "']").addClass("selectedView");
    if (view === "costs_in_context") {
      $("#cost_choice").addClass("selectedView").text("Costs: context");
    } else if (view === "costs_compared_overview") {
      $("#cost_choice").addClass("selectedView").text("Costs: compared");
    } else if (view === "costs_sensitivity") {
      $("#cost_choice").addClass("selectedView").text("Costs: sensitivity");
    } else {
      $("#cost_choice").text("Costs");
    }
    view_manager.setup();
    c = codeForChoices();
    data = cache[c];
    if (data != null) {
      view_manager.updateResults(data);
    }
    if (history['pushState'] != null) {
      return history.pushState(choices, c, url());
    }
  };

  switchPathway = function(new_code) {
    return setChoices(choicesForCode(new_code));
  };

  setChoices = function(new_choices) {
    $('.showdropdown').removeClass("showdropdown");
    old_choices = choices.slice(0);
    choices = new_choices;
    return loadMainPathway();
  };

  loadMainPathway = function(pushState) {
    var fetch, main_code;
    if (pushState == null) {
      pushState = true;
    }
    if (choices.join('') === old_choices.join('')) {
      return false;
    }
    updateControls(old_choices, choices);
    main_code = codeForChoices();
    if (history['pushState'] != null) {
      history.pushState(choices, main_code, url());
    }
    if (cache[main_code] != null) {
      view_manager.updateResults(cache[main_code]);
      return $('#calculating').hide();
    } else {
      $('#calculating').show();
      fetch = function() {
        return $.getJSON(url({
          code: main_code,
          view: 'data',
          sector: null,
          comparator: null
        }), function(data) {
          if (data != null) {
            cache[data._id] = data;
            if (data._id === codeForChoices()) {
              view_manager.updateResults(data);
              return $('#calculating').hide();
            }
          }
        });
      };
      return fetch();
    }
  };

  loadSecondaryPathway = function(secondary_code, callback) {
    var fetch;
    if (cache[secondary_code] != null) {
      return callback(cache[secondary_code]);
    } else {
      fetch = (function(_this) {
        return function() {
          return $.getJSON(url({
            code: secondary_code,
            view: 'data',
            sector: null,
            comparator: null
          }), function(data) {
            if (data != null) {
              cache[data._id] = data;
              return callback(data);
            }
          });
        };
      })(this);
      return fetch();
    }
  };

  window.onpopstate = function(event) {
    var url_elements;
    if (!event.state) {
      return false;
    }
    url_elements = window.location.pathname.split('/');
    setChoices(choicesForCode(url_elements[2]));
    switchView(url_elements[3]);
    if (view === 'costs_compared_within_sector') {
      switchSector(url_elements[4]);
    }
    if (url_elements[4] === 'comparator') {
      return switchComparator(url_elements[5]);
    }
  };

  updateControls = function(old_choices, choices) {
    var c, choice, choice_frview, choice_whole, controls, i, old_choice, old_choice_frview, old_choice_whole, row, _i, _j, _len, _ref, _ref1, _results;
    this.choices = choices;
    controls = $('#classic_controls');
    _ref = this.choices;
    _results = [];
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      choice = _ref[i];
      old_choice = old_choices[i];
      if (choice !== old_choices[i]) {
        old_choice_whole = Math.ceil(old_choice);
        old_choice_frview = parseInt((old_choice % 1) * 10);
        choice_whole = Math.ceil(choice);
        choice_frview = parseInt((choice % 1) * 10);
        row = controls.find("tr#r" + i);
        row.find(".selected, .level" + old_choice_whole + ", .level" + old_choice_whole + "_" + old_choice_frview).removeClass("selected level" + old_choice_whole + " level" + old_choice_whole + "_" + old_choice_frview);
        if (old_choice_frview !== 0) {
          controls.find("#c" + i + "l" + old_choice_whole).text(old_choice_whole);
        }
        row.find("#c" + i + "l" + choice_whole).addClass('selected');
        for (c = _j = 1, _ref1 = choice_whole - 1; 1 <= _ref1 ? _j <= _ref1 : _j >= _ref1; c = 1 <= _ref1 ? ++_j : --_j) {
          controls.find("#c" + i + "l" + c).addClass("level" + choice_whole);
        }
        if (choice_frview !== 0) {
          controls.find("#c" + i + "l" + choice_whole).text(choice);
          _results.push(controls.find("#c" + i + "l" + choice_whole).addClass("level" + choice_whole + "_" + choice_frview));
        } else {
          _results.push(controls.find("#c" + i + "l" + choice_whole).addClass("level" + choice_whole));
        }
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  getSector = function() {
    return parseInt(sector);
  };

  switchSector = function(new_sector) {
    sector = new_sector;
    if (history['pushState'] != null) {
      history.pushState(choices, codeForChoices(), url());
    }
    switchView('costs_compared_within_sector');
    view_manager.teardown();
    return view_manager.updateResults(cache[codeForChoices()]);
  };

  getComparator = function() {
    return comparator;
  };

  switchComparator = function(new_comparator) {
    comparator = new_comparator;
    if (history['pushState'] != null) {
      history.pushState(choices, codeForChoices(), url());
    }
    if (view_manager.switchComparator != null) {
      return view_manager.switchComparator(comparator);
    }
  };

  pathwayName = function(pathway_code, default_name) {
    if (default_name == null) {
      default_name = null;
    }
    return window.twentyfifty.pathway_names_hash[pathway_code] || default_name;
  };

  pathwayDescriptions = function(pathway_code, default_description) {
    if (default_description == null) {
      default_description = null;
    }
    return window.twentyfifty.pathway_descriptions_hash[pathway_code] || default_description;
  };

  pathwayWikiPages = function(pathway_code, default_page) {
    if (default_page == null) {
      default_page = null;
    }
    return "http://2050-calculator-tool-wiki.decc.gov.uk/pages/" + (window.twentyfifty.pathway_wiki_pages_hash[pathway_code] || default_page);
  };

  getChoices = function() {
    return choices;
  };

  window.twentyfifty.code = codeForChoices;

  window.twentyfifty.getChoices = getChoices;

  window.twentyfifty.setChoices = setChoices;

  window.twentyfifty.getSector = getSector;

  window.twentyfifty.switchSector = switchSector;

  window.twentyfifty.getComparator = getComparator;

  window.twentyfifty.switchComparator = switchComparator;

  window.twentyfifty.url = url;

  window.twentyfifty.go = go;

  window.twentyfifty.loadMainPathway = loadMainPathway;

  window.twentyfifty.loadSecondaryPathway = loadSecondaryPathway;

  window.twentyfifty.switchView = switchView;

  window.twentyfifty.switchPathway = switchPathway;

  window.twentyfifty.pathwayName = pathwayName;

  window.twentyfifty.pathwayDescriptions = pathwayDescriptions;

  window.twentyfifty.pathwayWikiPages = pathwayWikiPages;

  window.twentyfifty.startDemo = startDemo;

  window.twentyfifty.stopDemo = stopDemo;

  window.twentyfifty.views = views;

}).call(this);