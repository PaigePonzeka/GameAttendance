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

  /**
   * Load full view without any queried data
   * @return {[type]} [description]
   */
  View.prototype.loadFullView = function()  {
    // load everything
  };
  /**
   * load queried view if there are params in the url
   * @return {[type]} [description]
   */
  View.prototype.loadQueriedView = function() {
    // load only specific data
    //console.log("load Queried View");
  };

  /**
   * Set the title (assuming title is 'js-title')
   * @param {[type]} titleContent [description]
   */
  View.prototype.setTitle = function(titleContent){
    $('.js-title').html(titleContent);
  };

  /**
   * Uses Ajax template loading library to load the handlebars player list template
   *  (used across views)
   * @param  {[type]} data contains player information in json format players : {jsonById: [playerinfohere]}
   * @return {[type]}      [description]
   */
  View.prototype.showPlayerList = function(data) {
    var self = this;
    T.render('players', function(generateTemplate){
      self.playerContainer.html(generateTemplate(data));
    });
  };

  /**
   * Uses Ajax template loading library to load the handlebars games list template
   *  (used across views)
   * @param  {[type]} data contains player information in json format games : {jsonById: [playerinfohere]}
   * @return {[type]}      [description]
   */
  View.prototype.showGameList = function(data) {
    var self = this;
    T.render('games', function(generateTemplate){
      self.gameContainer.html(generateTemplate(data));
    });
  };

  /**
   * Shows the position view
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  View.prototype.showPositionList = function(data) {
    var self = this;
    T.render('positions', function(generateTemplate){
      self.positionContainer.html(generateTemplate(data));
    });
    this.bindPositionList(self.positionContainer);
  };

  /**
   * Table interactions for attendance buttons Yes/No
   * All buttons are assumed to have a data-playerid and data-gameid attributer
   * @return {JQueryObject} the table container
   */
  View.prototype.bindAttendanceTableActions = function($container){
    var self = this;
    // When the user clicks a button update the datebase value and the view
    $container.on('click', '.js-player-yes-btn, .js-player-no-btn', function(){
      // update the playerGame relationship
      var $this = $(this),
          playerId = $this.data('player-id'),
          gameId  = $this.data('game-id');

      self.attendanceButtonAction(playerId, gameId, $this);
    });
  };

  /**
   * assumes subclasses will have a gamePlayerParser attached to the parent
   * this might break stuff .. sets the action on the attendance button and updates the 
   * data on the server
   * 
   * @param  {string} playerId player id from the datebase 
   * @param  {string} gameId   game id from the datebase
   * @param  {jqueryObject} $button  clicked button
   */
  View.prototype.attendanceButtonAction = function(playerId, gameId, $button) {
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
      $button.closest('.js-game-player-row').toggleClass('yes-row', isAttending);
      $button.closest('.js-game-player-row').toggleClass('no-row', !isAttending);
    };

    this.gamePlayerParser.updateOrCreate(data, setRowClass(isAttending));
    var $parent = $button.closest('.js-player-list-container');
  };

  /**
   * Bind actions on positions table
   */
  View.prototype.bindPositionList = function($container){
    var self = this;
    $container.on('click','.js-position-yes-btn, .js-position-no-btn', function(){
      var playerId = $(this).data('player-id'),
          positionId = $(this).data('position-id'),
          isPosition = false,
          $button = $(this);
      if ($button.hasClass('js-position-yes-btn')) {
        isPosition = true;
      }

      var data = {
        'playerId' : playerId,
        'positionId': positionId,
        'isPosition' : isPosition
      };

      // change the view to show that data is loading
      var setRowClass = function(isAttending){
        $button.closest('.js-player-position-row').toggleClass('yes-row', isAttending);
        $button.closest('.js-player-position-row').toggleClass('no-row', !isAttending);
      }

      self.playerPositionParser.updateOrCreate(data, setRowClass(isPosition));

      
    });
  };



  /*************************************
   * IndexView constructor
   * Shows playerlist and shows gamelist
   **************************************/
  var IndexView = function(options){
    this.options = $.extend(true, {}, this.defaults, options);
    this.playerParser = new window.PlayerParser();
    this.gameParser = new window.GameParser();
    this.gameContainer = $('.js-game-list');
    this.playerContainer = $('.js-player-list');
    this.init();
  };
  window.inherits(IndexView, View);

  /**
   * intialize
   */
  IndexView.prototype.init = function(){
    var self = this;
    $(document).on('dataLoadedAndProcessed.Game', function(e, localData){
      var data = {
        games: localData
      };
      self.showGameList(data);
    });
    $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
      var data = {
        players: localData
      };
      self.showPlayerList(data);
    });
  };
  window.IndexView = IndexView;

  /*****************************
   * GameView Constructor
   * Shows the entire games list (TODO), 
   * Shows specific games if queried in the params, 
   * Shows week view iv queried in the params (TODO)
   ******************************/
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
    this.data.isEditView = true;
  };

  GameView.prototype.init = function(){
    var self = this;
    this.bindPlayersLoaded();
    this.bindAttendanceTableActions(this.playerContainer);
  };

  /**
   * Load the title and required data for the single game view
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
   * What to do when the game data is loaded
   *  Sets the title if we retrive any single game data
   * @param  {object} data loaded data
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
   * @param  {object} data player data
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

  /**
   * TODO - Load Week view if in the url params
   */
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
   * TODO - Load game players details for the week
   * TODO - what to do if we have more then two games a week?
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
  };

  /**
   * TODO - Returns a string that is the week view title
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


  /*****************************
   * PlayerView Constructor
   * Shows the entire player list (TODO), 
   * Shows specific players if queried in the params
   ******************************/
  var PlayerView = function(options){
    this.gameContainer = $('.js-game-list');
    this.positionContainer = $('.js-position-list');
    this.data = {};
    this.data.isEditView = true;
    View.call(this);
    //this.init();

  };
  window.inherits(PlayerView, View);


  /**
   * Load a Player Queried view
   */
  PlayerView.prototype.loadQueriedView = function() {
    // query for this player id
    if (this.params.playerid) {
      this.loadSinglePlayerView();
    } 
  };

  /**
   *  Query single player details, update the title
   */
  PlayerView.prototype.loadSinglePlayerView = function() {
    var playerParser = new window.PlayerParser( { params :{
      objectId: this.params.playerid
    }}),
    self = this;
    this.data.playerId = this.params.playerid;
    this.bindAttendanceTableActions(this.gameContainer);
    $(document).on('dataLoadedAndProcessed.Player',function(e, data){
       self.data.player = data;
      // set the single player title
      self.setSinglePlayerTitle();
      self.loadGames();
      // TODO - get the player's positions
      self.loadPositions();
        // load all positions
        // load all positionPlayers (with this players id)
    });
  };

  /**
   * Set the single player view title
   * @param {jqueryObject} playerObj json object containing the player data
   */
  PlayerView.prototype.setSinglePlayerTitle = function(playerObj) {
    var playerObj =  this.data.player.jsonById[this.params.playerid];
    this.setTitle(playerObj.firstName + ' ' + playerObj.lastName + ' #' + playerObj.number);
  };

  /**
   * Load all the game details and game players and populate the table
   */
  PlayerView.prototype.loadGames = function() {
    this.gameParser = new window.GameParser();
    var self = this;

    $(document).on('dataLoadedAndProcessed.Game',function(e, data){
      self.data.games = data;
      self.gamePlayerParser = new window.GamePlayersParser({
        params: {playerId: self.params.playerid}
      });
      self.gamePlayerParser.load();

      $(document).on('dataLoadedAndProcessed.GamePlayer', function(e, data){
        // for each game go through and add isAttending Flag to it
        $.each(data.jsonByGameId, function(key, value){
        var isAttending = value[0].isAttending;
        self.data.games.jsonById[key].isAttending = isAttending;
      });
        // show the game list
       self.showGameList(self.data);
      });
    });
  };

  /**
   * Loads Positions and the player Positions and populates the view
   */
  PlayerView.prototype.loadPositions = function() {
    var self = this;
    this.positionParser = new window.PositionParser();

    $(document).on('dataLoadedAndProcessed.Position', function(e, data){
      self.data.positions = data;
      self.playerPositionParser = new window.PlayerPositionParser({
        params: {
          playerId: self.params.playerid
        }
      });

      $(document).on('dataLoadedAndProcessed.PlayerPosition', function(e, data){
        $.each(data.jsonByPositionId, function(key, value){
          var isPosition = value.isPosition;
          self.data.positions.jsonById[key].isPosition = isPosition;
        });
        self.showPositionList(self.data);
      });
    });
  };

  window.PlayerView = PlayerView;
  

  /*****************************************
   * ----------- Global Utilities ----------
   ******************************************/
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
    return formatDate(date);
  });

  Handlebars.registerHelper("setAttendingClass", function(isAttending) {
    if (isAttending === undefined) {
      return "";
    } else if (isAttending == true) {
      return "yes-row";
    } else {
      return "no-row";
    }
  });


  Handlebars.registerHelper("setPlaysPositionClass", function(isAttending) {
    if (isAttending === undefined) {
      return "";
    } else if (isAttending == true) {
      return "yes-row";
    } else {
      return "no-row";
    }
  });

  Handlebars.registerHelper("setPlaysPosition", function(isPosition){
    if (isPosition === undefined) {
      return "";
    } else if (isPosition == true) {
      return "btn-success";
    } else {
      return "btn-danger";
    }

  });

  })(window, document);