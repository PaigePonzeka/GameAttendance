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
  window.View = View;
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
    //console.log("load Queried View");
  };

  View.prototype.setTitle = function(titleContent){
    $('.js-title').html(titleContent);
  };

  View.prototype.showPlayerList = function(data) {
    var self = this;
    T.render('players', function(generateTemplate){
      self.playerContainer.html(generateTemplate(data));
    });
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
    this.gameContainer = $('.js-game-list');
    this.playerContainer = $('.js-player-list');
    this.init();
  };
  window.inherits(IndexView, View);

  IndexView.prototype.init = function(){
    var self = this;
    $(document).on('dataLoadedAndProcessed.Game', function(e, localData){
      self.showGameList(localData.jsonById);
    });
    $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
      var data = {
        players: localData
      };
      self.showPlayerList(data);
    });
  };

  IndexView.prototype.showGameList = function(data) {
    var self = this;
    T.render('games', function(generateTemplate){
      self.gameContainer.html(generateTemplate(data));
    });
  };

  window.IndexView = IndexView;

  /**
   * GameView Constructor
   */
  var GameView = function(options){
    this.playerParser = new window.PlayerParser();
    this.playersLoaded = false;
    View.call(this);
    this.playerContainer = $('.js-player-list');
    this.init();
    this.options = $.extend(true, {}, this.defaults, options);

  };

  window.inherits(GameView, View);

  GameView.prototype.load = function() {
    GameView.superClass_.load.call(this);
    this.data = {};
    this.data.isGameView = true;
  };

  GameView.prototype.init = function(){
    var self = this;
    this.bindPlayersLoaded();
    this.bindPlayerTableActions();
  };

  /**
   * Load the title and required data for the single game view
   * @return {[type]} [description]
   */
  GameView.prototype.loadSingleGameView = function(){
    var self = this;
    var gameParser = new GameParser({
      params: { objectId: this.params.gameId, ascending: 'dateTime'},
    }),
    self = this;

     // when the single game details are loaded display the title
    $(document).on('dataLoadedAndProcessed.Game',function(e, data){
      self.onGameLoaded(data);
    });

    // query for the gamePlayer details 
    this.gamePlayerParser = new GamePlayersParser({
      params: {'gameId': this.params.gameid}
    });
    this.gamePlayerParser.load();
     $(document).on('dataLoadedAndProcessed.GamePlayer',function(e, data){
      self.onGamePlayerLoaded(data);
      self.data.gamePlayer = data;
      // update the player object to show the isAttending status
      $.each(data.jsonByPlayerId, function(key, value){
        var isAttending = value[0].isAttending;
        self.data.players.jsonById[key].isAttending = isAttending;

      });
      self.showPlayerList(self.data);
    });
  };

  /**
   * What to do when GamePlayer Data is loaded
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  GameView.prototype.onGamePlayerLoaded = function(data) {
    console.log("Game Player Loaded", data);
    // iterate through and set the player as attending
  };

  /**
   * What to do when the game data is loaded
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  GameView.prototype.onGameLoaded = function(data){
    var game = data.jsonById[this.params.gameid];
    this.data.gameId = this.params.gameid;
    if (game) {
      this.setTitle(formatDate(game.dateTime) + ' ' + game.field + ' ' + game.opponent);
    }
  };

  /**
   * What to do when player data is loaded
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  GameView.prototype.onPlayerLoaded = function(data) {
    this.data.players = data;
    if (this.params.week) {
      this.loadWeekView();
      // query for the games this week
    } else if (this.params.gameid) {
      this.loadSingleGameView();
      // query for the games id
    } else {
      // unsupported load regular view of all games
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
      var gameIds = [];
      self.data.games = data;
      $.each(data.jsonById, function(key, value){
        gameIds.push(key);
      });
      self.loadWeekGamePlayers(gameIds);
    });
  };

  /**
   * Loads all the players on the roster 
   */
  GameView.prototype.bindPlayersLoaded = function(){
    var self = this;
    $(document).on('dataLoadedAndProcessed.Player', function(e, data){
      self.onPlayerLoaded(data);
    });
  };

  /**
   * Table interactions
   * @return {[type]} [description]
   */
  GameView.prototype.bindPlayerTableActions = function(){
    var self = this;
    // When the user clicks a button update the datebase value and the view
    this.playerContainer.on('click', '.js-player-yes-btn, .js-player-no-btn', function(){
      // update the playerGame relationship
      var $this = $(this),
          playerId = $this.data('player-id'),
          gameId  = $this.data('game-id');

      self.attendanceButtonAction(playerId, gameId, $this);
    });
  };

  /**
   * When the user s
   * @param  {string} playerId player id from the datebase 
   * @param  {string} gameId   game id from the datebase
   * @param  {jqueryObject} $button  clicked button
   * @return {[type]}          [description]
   */
  GameView.prototype.attendanceButtonAction = function(playerId, gameId, $button) {
    var isAttending = false;

    if ($button.hasClass('js-player-yes-btn')) {
      isAttending = true;
    }
    var data = {
      'playerId' : playerId,
      'gameId' : gameId,
      'isAttending' : isAttending
    };
    // change the view to show that data is loading
    var setRowClass = function(isAttending){
      $button.closest('.js-game-player-row').toggleClass('game-attending-row', isAttending);
      $button.closest('.js-game-player-row').toggleClass('game-not-attending-row', !isAttending);
    }

    this.gamePlayerParser.updateOrCreate(data, setRowClass(isAttending));
    var $parent = $button.closest('.js-player-list-container');

  };

  /**
   * Load game players details for the week
   */
  GameView.prototype.loadWeekGamePlayers = function(gameIds){
    // load the game player data for each gameId
    var gamePlayerParser = new GamePlayersParser();
    // load a game player for each game (currently only supports double headers)
    gamePlayerParser.setQueryParameters = function(query) {
      query.equalTo("gameId", gameIds[0]);
       
      var gameTwoQuery = new Parse.Query("GamePlayer");
      gameTwoQuery.equalTo("gameId", gameIds[1]);
       
      var mainQuery = Parse.Query.or(query, gameTwoQuery);
      mainQuery.limit(1000);
      return mainQuery;
    };
    gamePlayerParser.load();

    $(document).on('dataLoadedAndProcessed.GamePlayer',function(e, data){ 
    });
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

  window.GameView = GameView;

  var PlayerView = function(options){
    this.gameContainer = $('.js-game-list');
    View.call(this);
    
    //this.init();

  };
  window.inherits(PlayerView, View);

  /*PlayerView.prototype.load = function() {
    PlayerView.superClass_.load.call(this);
  };*/

  /**
   * Load a Single Player View
   */
  PlayerView.prototype.loadQueriedView = function() {
    // query for this player id
    console.log(this.params);
    if (this.params.playerid) {
      this.loadSinglePlayerView();
    } 
  };

  /**
   *  Query single player details, update the title
   */
  PlayerView.prototype.loadSinglePlayerView = function() {
    var playerParser = window.PlayerParser( { params :{
      playerId: this.params.playerid
    }});
  };

  window.PlayerView = PlayerView;
  /**
   * ----------- Global Utilities ----------
   */
  var justTime = function(dateObj) {
    return moment(dateObj).format(' h:mm A');
  };

  var justDate = function(dateObj) {
    return moment(dateObj).format('dddd, MMM D, YYYY');
  };

  var formatDate = function(date) {
    return moment(date).format('ddd, MMM D YYYY, h:mm A');
  };

  Handlebars.registerHelper("formatDate", function(date) {
    formatDate(date);
  });

  Handlebars.registerHelper("isAttendingGame", function(){
    console.log(this);
  });

  Handlebars.registerHelper("setAttendingClass", function(isAttending) {
    if (isAttending === undefined) {
      return "";
    } else if (isAttending == true) {
      return "game-attending-row";
    } else {
      return "game-not-attending-row ";
    }
  });

  })(window, document);