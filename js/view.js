(function(window, document, undefined){
  /*
 * This decorates Handlebars.js with the ability to load
 * templates from an external source, with light caching.
 * 
 * To render a template, pass a closure that will receive the 
 * template as a function parameter, eg, 
 *   T.render('templateName', function(t) {
 *       $('#somediv').html( t() );
 *   });
 * Source: https://github.com/wycats/handlebars.js/issues/82
 */
var Template = function() {
    this.cached = {};
};
var T = new Template();
$.extend(Template.prototype, {
    render: function(name, callback) {
        if (T.isCached(name)) {
            callback(T.cached[name]);
        } else {
            $.get(T.urlFor(name), function(raw) {
                T.store(name, raw);
                T.render(name, callback);
            });
        }
    },
    renderSync: function(name, callback) {
        if (!T.isCached(name)) {
            T.fetch(name);
        }
        T.render(name, callback);
    },
    prefetch: function(name) {
        $.get(T.urlFor(name), function(raw) { 
            T.store(name, raw);
        });
    },
    fetch: function(name) {
        // synchronous, for those times when you need it.
        if (! T.isCached(name)) {
            var raw = $.ajax({'url': T.urlFor(name), 'async': false}).responseText;
            T.store(name, raw);         
        }
    },
    isCached: function(name) {
        return !!T.cached[name];
    },
    store: function(name, raw) {
        T.cached[name] = Handlebars.compile(raw);
    },
    urlFor: function(name) {
        return "./templates/"+ name + ".handlebars";
    }
});
  var View = function(options) {
    this.options = $.extend(true, {}, this.defaults, options);
    this.params = this.parseUrl();
    this.load();
  };

  /**
   * Parses parameters from the url (if there are none return an empty object)
   * @return {Object} URL parameters
   */
  View.prototype.parseUrl = function () {
    var params = window.location.hash,
        decodedParams;
    
    if (params) {
      params = params.substring(1, params.length);
    }

    if (params.length > 0) {
      decodedParams = this.parse(params);
    }
    return decodedParams;
  };

  /**
   * Decordes the url parameters and returns aa reference array
   * @param  {String} parameters url parameters
   * @return {[type]}            [description]
   */
  View.prototype.parse = function(parameters) {
    var decoded = decodeURIComponent(parameters);
    var keyValues = [];
    var splitValues = decoded.split("&");

    if (splitValues.length > 0) {
      $.each(splitValues, function(){
        var values = this.split('=');
        var key = values[0];
        var value;

        // if the key is for an array, we need to treat it differently
        if (key.indexOf('[]') >= 0) {
          key = key.split('[]')[0]; // just remove the brackets for easy reading
          // if this is a new array value, intialize it
          if (!keyValues[key]) {
            value = [];
          } else {
            value = keyValues[key];
          }
          
          value.push(decodeURIComponent(values[1]));
        } else {
          value = values[1];
        }
        keyValues[key] = value;
      });
    }
    return keyValues;
  };

  /**
   * Loads the view and runs any required queries
   */
  View.prototype.load = function(){
    console.log(this.params);
    if (this.params) {
      this.loadQueriedView();
    } else {
      this.loadFullView();
    }
  };

  View.prototype.loadFullView = function()  {
    // load everything
  };

  View.prototype.loadQueriedView = function() {
    // load only specific data
    console.log("load Queried View");
  };

  View.prototype.setTitle = function(titleContent){
    $('.js-title').html(titleContent);
  };

  /**
   * IndexView constructor
   * Shows playerlist and shows gamelist
   */
  var IndexView = function(options){
    this.options = $.extend(true, {}, this.defaults, options);
    // load the games and players
    this.playerParser = new window.PlayerParser();
    this.gameParser = new window.GameParser();
    this.gameTemplate = Handlebars.compile($('#game-template').html());
    this.gameContainer = $('.js-game-list');
    this.playerTemplate = Handlebars.compile($('#player-template').html());
    this.playerContainer = $('.js-player-list');
    T.render('template', function(t){
      console.log(t());
    });
    this.init();
  };


  IndexView.prototype.init = function(){
    var self = this;
    $(document).on('dataLoadedAndProcessed.Game', function(e, localData){
      self.showGameList(localData.jsonById);
    });
    $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
      self.showPlayerList(localData.jsonById);
    });
  };

  IndexView.prototype.showGameList = function(data) {
    this.gameContainer.html(this.gameTemplate(data));
  };

  IndexView.prototype.showPlayerList = function(data) {
    this.playerContainer.html(this.playerTemplate(data));
  };

  window.IndexView = IndexView;

  /**
   * GameView Constructor
   */
  var GameView = function(options){
    this.playerParser = new window.PlayerParser();
    this.playersLoaded = false;
    this.init();
    View.call(this);
    this.options = $.extend(true, {}, this.defaults, options);

    //this.init();
    // load players

    // load gamePlayers
   //this.gamePlayersParser = new window.GamePlayersParser();

  };
  window.inherits(GameView, View);

  GameView.prototype.load = function() {
    GameView.superClass_.load.call(this);
  };

  GameView.prototype.init = function(){
    var self = this;
    var playersLoaded = false;
    $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
      this.playersLoaded = true;
      if (playersLoaded) {

        self.showGamePlayerList(localData);
      }
    });
    /*$(document).on('dataLoadedAndProcessed.GamePlayer', function(e, localData){
      gamePlayersLoaded = true;
      if (gamePlayersLoaded && playersLoaded) {
        self.showGamePlayerList(localData.jsonById);
      }
    });*/
  };

  GameView.prototype.loadQueriedView = function() {
    console.log("Loading Queried View : GameView");
    if (this.params.week) {
      this.loadWeekView();
      // query for the games this week
    } else if (this.params.gameid) {
      this.loadSingleGameView();
      // query for the games id
    } else {
      // unsupported load regular view
      this.loadFullView();
    }
  };

  GameView.prototype.loadWeekView = function() {
    var gameParser = new GameParser({params: {
      columnName: 'week',
      value: parseInt(this.params.week)
    }}),
      self = this;
    var title = "Week " + this.params.week + ":";
    
    // update the title
    $(document).on('dataLoadedAndProcessed.Game',function(e, data){
      self.setTitle(self.getWeekTitle(data.jsonById));
      console.log(data.jsonById);
      var gameIds = [];
      $.each(data.jsonById, function(key, value){
        console.log(key);
        gameIds.push(key);
      });
      console.log(gameIds);
      // load the game player data for each gameId
      self.gamePlayerParser = new GamePlayersParser({
        params: {
          gameId: gameIds
        }
      });
    });
    // query games parser for a week value
  };


  /**
   * Returns a string that is the week view title
   * @return {string} string of what the title should look like
   */
  GameView.prototype.getWeekTitle = function(games){
    // assuming since they're ordered by datetime that the first game listed
    //  is the starting time of ALL the games
    var title = "Week " +this.params.week + ': ';
    var keys = [];
    $.each(games, function(key, value){
      keys.push(key);
    });
    var gameDate = games[keys[0]].dateTime;
    title += justDate(gameDate);
    title += ' Starting At:' + justTime(gameDate);
    return title;
  };

  GameView.prototype.showGamePlayerList = function(){
    console.log("Show Player List");
  };

  window.GameView = GameView;

  var justTime = function(dateObj) {
    return moment(dateObj).format(' h:mm A');
  };

  var justDate = function(dateObj) {
    return moment(dateObj).format('dddd, MMM D, YYYY');
  };

  Handlebars.registerHelper("formatDate", function(date) {
    return moment(date).format('ddd, MMM D YYYY, h:mm A');
  });

  })(window, document);