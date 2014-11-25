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
    this.cookieGenerator = new CookieGenerator();
    this.checkForLoggedInUser();
    this.setUsername();
    this.bindGlobalActions();
    this.load();
    this.checkAndShowManagerView();
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
   * Binds global view actions
   */
  View.prototype.bindGlobalActions = function(){
    var self = this;
    var logoutManager = function(event) {
      event.preventDefault();
      // delete cookies
      self.cookieGenerator.erase('userEmail');
      self.cookieGenerator.erase('userId');
      self.user = {};
      // Show messages
      self.showMessage('You have been Logged out!', 'success');
      // refresh page
      window.location ='./login.html';
      
    };
    $('.js-manager-logout').on('click', logoutManager);
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

  View.prototype.showMessage = function(content, type){
    var $messageBlock = $('.js-message-block');
    $messageBlock.removeClass('alert-danger alert-success');
    $messageBlock.find('.js-message-block-title').html("");
    if (type === 'error') {
      $messageBlock.addClass('alert-danger');
      $messageBlock.find('.js-message-block-title').html("Error!");
    } else if (type === 'success') {
      $messageBlock.addClass('alert-success');
      $messageBlock.find('.js-message-block-title').html("Success!");
    }
    $messageBlock.find('.js-message-block-content').html(content);
    $messageBlock.show();
  };


  /**
   * Hides error message div
   */
  View.prototype.hideMessage = function(){
    var $messageBlock = $('.js-message-block');
    $messageBlock.hide();
  };

  /**
   * Updates all divs with 'js-username' class with the username (currently user email)
   */
  View.prototype.setUsername=function(){
    if (this.isLoggedIn()) {
      $('.js-username').html(' ' + this.user.email);
    }
  }

  /**
   * Checks to see if user is logged in (if user cookie exists)
   */
  View.prototype.checkForLoggedInUser = function(){
    var cookieJson = this.cookieGenerator.read();
    this.user = {};
    if (cookieJson.userId) {
      this.user.id = cookieJson.userId;
    }

    if (cookieJson.userEmail) {
      this.user.email = cookieJson.userEmail;
    }
  };

  View.prototype.isLoggedIn = function(){
    if (this.user.id && this.user.email) {
      return true;
    }
    return false;
  };

  /**
   * Converts form data to a Json valid for the server
   * @return {[type]} [description]
   */
  View.prototype.formToJson = function(form){
    var formArray = $(form).serializeArray();
    var formJson = {};
    formArray.forEach(function(input){
      formJson[input.name] = input.value;
    });
    return formJson;
  };

  /**
   * If a user is logged in show that view
   * @return {[type]} [description]
   */
  View.prototype.checkAndShowManagerView = function(){
    if (this.isLoggedIn()) {
      $('.js-logged-in-view').show();
      $('.js-logged-out-view').hide();
    } else {
      $('.js-logged-in-view').hide();
      $('.js-logged-out-view').show();
    }
  };

  /*****************************
   * IndexView structor
   * Checks to see if the user is logged in as a manager and displays appropiate data
   ******************************/
  var IndexView = function(options) {
    View.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
    this.init();
  };
  window.inherits(IndexView, View);

  IndexView.prototype.init = function(){
    this.checkAndShowManagerView();
  };

  window.IndexView = IndexView;


  /*****************************
   * GameView Constructor
   * Shows the entire games list when there are no queries, 
   * Shows specific games if queried in the params, 
   * Shows week view iv queried in the params (TODO)
   ******************************/
  var GameView = function(options){
    View.call(this);
    this.playerContainer = $('.js-player-list');
    this.gameContainer = $('.js-game-list');
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
    this.bindAttendanceTableActions(this.playerContainer);
  };

  /**
   * Loads and shows the list of all games
   */
  GameView.prototype.loadFullView = function(){
    var self = this;
    this.gamesParser = new window.GameParser();
    $(document).on('dataLoadedAndProcessed.Game', function(e, data){
      var localData = {
        games : data
      };
      self.showGameList(localData);
    });
  };

  GameView.prototype.loadQueriedView = function() {
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
   * Load the title and required data for the single game view
   * Loads players since we show the player list for attending a single/multiple games
   */
  GameView.prototype.loadSingleGameView = function(){
    var self = this;
    this.playerParser = new window.PlayerParser();
    this.playersLoaded = false;
    
    $(document).on('dataLoadedAndProcessed.Player', function(e, data){
      self.data.players = data;
      self.gameParser = new GameParser({
        params: { objectId: self.params.gameid, ascending: 'dateTime'},
      });
          // when the single game details are loaded display the title
      $(document).on('dataLoadedAndProcessed.Game',function(e, data){
        self.onGameLoaded(data);
      });

      // query for the gamePlayer details 
      self.gamePlayerParser = new GamePlayersParser({
        params: {'gameId': self.params.gameid}
      });
      self.gamePlayerParser.load();
       $(document).on('dataLoadedAndProcessed.GamePlayer',function(e, data){
        self.data.gamePlayer = data;
        // update the player object to show the isAttending status
        $.each(data.jsonByPlayerId, function(key, value){
          var isAttending = value[0].isAttending;
          self.data.players.jsonById[key].isAttending = isAttending;
        });

        self.showPlayerList(self.data);
      });
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
    this.playerContainer = $('.js-player-list');
    this.data = {};
    this.data.isEditView = true;
    View.call(this);
  };
  window.inherits(PlayerView, View);

  /**
   * Show the list of all players
   */
  PlayerView.prototype.loadFullView = function() {
    var self = this;
    var playerParser = new PlayerParser();
    $(document).on('dataLoadedAndProcessed.Player', function(e, data){
      var localData = {
        players: data
      };
      self.showPlayerList(localData);
    });
  };


  /**
   * Load a Player Queried view
   */
  PlayerView.prototype.loadQueriedView = function() {
    // query for this player id
    if (this.params.playerid) {
      this.loadSinglePlayerView();
    } else { // unsupported query just show full view
      this.loadFullView();
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
      self.loadPositions();
      self.setPlayerForm(data.jsonById[self.data.playerId]);
    });
  };

  /**
   * Sets the intial values for the player form
   */
  PlayerView.prototype.setPlayerForm = function(data) {
    console.log('setPlayerForm', data);
    var $playForm = $('#player-form');
    $.each(data, function(key, value){
      console.log(key);
      console.log(value);
      var $input = $playerForm.find('[name=' +key +']');
      console.log($input);
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

  var SignupView = function(){
    this.managerParser = new window.ManagerParser();
    this.bindActions();
  };
  window.inherits(SignupView, View);

  SignupView.prototype.bindActions = function(){
    var self = this;
    $( "#signup-form" ).submit(function( event ) {
      event.preventDefault();
      var formJson = self.formToJson(this);

      // validate 
      var valid = self.managerParser.validate(formJson);
      $(document).on('dataValidated.Manager', function(e, data){
        if (data.isValid) {
          self.hideMessage();

          var onSaveSuccess = function(){
            self.showMessage("Account Created! Now you can login!", 'success');
          };
          self.managerParser.save(formJson);

          $(document).on('dataSaved.Manager', function(){
            onSaveSuccess();
            // redirect user to the main page logged in 
          });
        }
        else {
          self.showMessage(data.msg, 'error');
        }
      });
      
    });
  };
  
  window.SignupView = SignupView;

  var LoginView = function(){
    this.bindActions();
    this.managerParser = new ManagerParser();
  };
  window.inherits(LoginView, View);

  LoginView.prototype.bindActions = function(){
    var self = this;
    $('#login-form').submit(function(event){
      $(this).find('.btn').attr('disabled', true);
      self.hideMessage();
      event.preventDefault();
      var formArray = $(this).serializeArray();
      var formJson = {};
      formArray.forEach(function(input){
        formJson[input.name] = input.value;
      });
      var passwordHash = CryptoJS.SHA1(formJson.password);
      self.manager = new ManagerParser({
        params : {
          email : formJson.email,
          password : passwordHash.toString()
        }
      }); 
      self.manager.load();
      $(document).bind('dataLoadedAndProcessed.Manager', function(e, data){
        if (Object.keys(data.jsonById).length === 0) {
          self.showMessage("Login Failed!", "error");
          $(this).find('.btn').removeAttr('disabled');
        } else {
          // create the user's cookies to remember them throughout the site
          var cookieGenerator = new CookieGenerator();
          $.each(data.jsonById, function(key, value){
            cookieGenerator.create('userId', this.id);
            cookieGenerator.create('userEmail', this.email);
          });

          // show success message
          self.showMessage("Logged in! Redirecting...", "success");
          window.location = './index.html';
        }
        // create a manager session and login the manager

        $(document).unbind('dataLoadedAndProcessed.Manager');
      });
    });
  };
  window.LoginView = LoginView;

  /*****************************
   * TeamView Constructor
   * Checks to see if current manager has a team - TODO
   * if manager has team
   *    Shows the Roster with edit buttons for players
   *    Shows current team name and info with option to edit
   * if the manager does not have a team 
   *   - Show the create form
   ******************************/
  var TeamView = function(){
    View.call(this);
    if (this.isLoggedIn()){
      this.dateTimeFormat = 'm/d/Y g:i A';
      this.playerParser = {};
      this.playerContainer = $('.js-roster-container');
      this.gameContainer = $('.js-schedule-container');
      this.gameParser = {};
      this.teamParser = new window.TeamParser({ 
        params: {
          managerId: this.user.id 
        }
      });
      this.init();
      this.bindActions();
      
    } else {
      this.showMessage("Please Login!", "error")
    }
  };
  window.inherits(TeamView, View);
  
  TeamView.prototype.init = function(){
    $('.js-manager-id').val(this.user.id);
    this.loadTeam();
    this.initDateTimePicker();
  };

  TeamView.prototype.loadTeam = function(){
    var self = this;
    // load the users team details
    this.teamParser.load();

    var onTeamLoad = function(e, data){
      // we just want the first team (Managers only have one team)
      for(var key in data.jsonById) break;
      var team = data.jsonById[key];
      $('.js-team-id').val(team.id);
      self.setTeamName(team.name);
      self.loadRoster(team.id);
      self.loadSchedule(team.id);
    };

    $(document).on('dataLoadedAndProcessed.Team', onTeamLoad);
  };
  
  // TODO(paige) what happens when the manager hasn't set up a team yet?
  TeamView.prototype.loadSchedule = function(teamId){
    this.gameParser = new window.GameParser({'teamId': teamId});
    var self = this;
    var onScheduleLoad = function(e, data){
      var info = {
        games: data
      };
      self.showGameList(info);
    };

     $(document).on('dataLoadedAndProcessed.Game', onScheduleLoad);
  };

  TeamView.prototype.loadRoster = function(teamId){
    var self = this;
    
    this.playerParser = new window.PlayerParser({params :{
      'teamId' : teamId
    }});

    var onPlayerQueryLoaded = function(e, data) {
      var info = {};
      info.players = data;
      info.isRosterList = true;
      self.showPlayerList(info);
      $(document).unbind('dataLoadedAndProcessed.Player');
    };

    $(document).on('dataLoadedAndProcessed.Player', onPlayerQueryLoaded);
  };

  // set the team name
  TeamView.prototype.setTeamName = function(name){
    $('.js-team-name').val(name);
    $('.js-team-name-text').html(name);
  };

  TeamView.prototype.initDateTimePicker = function(){
    var self = this;
    $('.js-datetime-picker').datetimepicker({
      defaultDate: new Date(),
      format: self.dateTimeFormat,
      formatTime: 'g:i A'
    });
  };

  /**
   * Bind all view actions
   * @return {[type]} [description]
   */
  TeamView.prototype.bindActions = function(){
    var self = this;

    $('.js-edit-team-btn').on('click', function(){
      $('.js-edit-team-panel').slideToggle();
    });

    this.playerContainer.on('click', '.js-delete-player-btn', function(e){
      e.preventDefault();
      var $row = $(this).closest('.js-game-player-row'),
          playerId = $row.data('playerid'),
          playerObject = self.playerParser.localData.dataById[playerId];
      $deletingDiv = $('<div>', {'class': 'is-delete-pending'}); // TODO (use this universally?)
      $row.find('.td-actions').append($deletingDiv);
      // Delete Player
      self.playerParser.delete(playerObject);
      $(document).on('dataDeleted.Player', function(e, details){
        $deletingDiv.fadeOut();
        $row.fadeOut();
        $(document).unbind('dataDelete.Player');
      });
    });

    $('#team-form').on('submit', function(event){
      event.preventDefault();
      var formJson = self.formToJson(this);
      self.teamParser.update(formJson); 

      $(document).on('dataSaved.Team', function(e, data, json){
        // change name
        self.setTeamName(json.name);
        self.showMessage("Team Saved!", 'success');
        $(document).unbind('dataSaved.Team');
      });
    });

    $('#player-form').on('submit', function(event){
      event.preventDefault();
      var formJson = self.formToJson(this);
      self.playerParser.update(formJson);

      $(document).on('dataSaved.Player', function(e, data, json){
        self.showMessage("Player Saved!", 'success');
        var $playerRow = self.playerContainer.find('.js-game-player-row:last').clone();
        $playerRow.find('.js-game-player-name').html(json.lastName + ',' + json.firstName);
        $playerRow.find('.js-game-player-number').html(json.number);
        $playerRow.attr('data-playerid', json.id);
        $playerRow.hide().appendTo(self.playerContainer.find('table'));
        $playerRow.fadeIn();
        $(document).unbind('dataSaved.Player');
      });
    });

    $('#game-form').on('submit', function(event){
      event.preventDefault();
      var formJson = self.formToJson(this);
      // convert date to a local date time with moment
      // The JQuery Plugin uses the wrong date formats -_-
      var momentDate = new moment(formJson.datetime, 'M/D/YYYY H:mm A');
      formJson.datetime = momentDate.toDate();
      self.gameParser.save(formJson);
      $(document).on('dataSaved.Game', function(){
        self.showMessage('Game Saved!', 'success');
        // remember to unbind so it doesn't repead
        $(document).unbind('dataSaved.Game');
      });
    });
  };
  window.TeamView = TeamView;

  /** Cookie Uitilities **/
  var CookieGenerator = function(options){
    // TODO if they revisit to we want to reinitialize the cookie?
    this.daysToExpire = 30; // cookie expires in 30 days
    this.options = $.extend(true, {}, this.defaults, options);
  };

  /**
   * Creates a new cookie with the given name value pair and set to expire at the given time
   * @param  {string} name  name of the cookie
   * @param  {string} value value of the cookie
   * @param  {int} days  time for cookie to expire (defaults to 30)
   */
  CookieGenerator.prototype.create = function(name,value,days) {
    if (!days) {
      days = this.daysToExpire;
    }

    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  };

  /**
   * Returns a cookiejson file or null if there are no cookies found
   */
  CookieGenerator.prototype.read = function(){
    var nameEQ = name + "=";
    var cookieItems = document.cookie.split(';');
    var cookieJson = {};

    if (cookieItems[0] === '') { // there are no cookies
      return null;
    }

    // processing the cookie into something the whole app can use easily
    $.each(cookieItems, function(key,value){
      var details = value.trim().split('=');
      if (details) {
        cookieJson[details[0]] = details[1];
      }
    });
    return cookieJson;
  };

  /**
   * Erases the cookie by setting its exp date to the past
   * @param  {string} name name of set cookie
   * @return {[type]}      [description]
   */
  CookieGenerator.prototype.erase = function(name) {
    this.create(name, "", -1);
  }


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