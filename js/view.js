(function(window, document, undefined){

  /**
   * IndexView constructor
   * Shows playerlist and shows gamelist
   */
  var IndexView = function(options){
    this.options = $.extend(true, {}, this.defaults, options);
    var playerLoaded = false;
          gameLoaded = false;
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
      gameLoaded = true;
      self.showGameList(localData.jsonById);
    });
    $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
      playerLoaded = true;
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

  Handlebars.registerHelper("formatDate", function(date) {
    return moment(date).format('ddd, MMM D YYYY, h:mm A');
  });

  })(window, document);