(function(window, document, undefined){

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
    this.options = $.extend(true, {}, this.defaults, options);
    this.init();
    // load players
    this.playerParser = new window.PlayerParser();
    // load gamePlayers
    this.gamePlayersParser = new window.GamePlayersParser();

  };

  GameView.prototype.init = function(){
    var self = this;
    var playersLoaded = false,
        gamePlayersLoaded = false;
    $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
      playersLoaded = true;
      if (playersLoaded && gamePlayersLoaded) {
        self.showGamePlayerList(localData);
      }
    });
    $(document).on('dataLoadedAndProcessed.GamePlayer', function(e, localData){
      gamePlayersLoaded = true;
      if (gamePlayersLoaded && playersLoaded) {
        self.showGamePlayerList(localData.jsonById);
      }
    });
  };

  GameView.prototype.showGamePlayerList = function(){
    console.log("Show Player List");
  };

  window.GameView = GameView;

  Handlebars.registerHelper("formatDate", function(date) {
    return moment(date).format('ddd, MMM D YYYY, h:mm A');
  });

  })(window, document);