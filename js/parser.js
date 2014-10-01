(function(window, document, undefined){
  Parse.initialize("q6NTBFdYRPR1oLOCDKVPTOEu14oRjFoFZFrh4Zks", "OA99A6vm4sKw0HfTUFtH9AbTC7qfVUto5K1auETq");

  window.inherits = function(child, parent) {
    /** @constructor */
    function temp() {};
    temp.prototype = parent.prototype;
    child.superClass_ = parent.prototype;
    child.prototype = new temp();
    child.prototype.constructor = child;
  };


  /**
   * @constructor Parser
   * Works with parse data objects from the parse library
   */
  var Parser = function(){
    this.localData = {};
    this.localData.jsonById = {};
    this.localData.dataById = {};
    this.name = name;;
  };

  Parser.prototype.init = function() {
    this.dataObject = Parse.Object.extend(this.name);
  };

  /**
  * Saves a new Parse Object
  */
  Parser.prototype.save = function(data){
    var newObject = new this.dataObject();

    newObject.save(data, {
      success: function(result) {
        $.event.trigger('dataSaved.' + this.name, [result]);
      },
      error: function(result, error) {
        $.event.trigger('dataSaveError.' + this.name , [result]);
      }
    });
  };

  /**
   * Queries for all of the data items at the database
   */
  Parser.prototype.load = function() {
    var self = this;
    var query = new Parse.Query(this.dataObject);
    query = this.setQueryParameters(query);
    //query.ascending('lastName');
    query.find({
      success: function(results) {
        self.processResults(results);
        $.event.trigger('dataLoaded.' + self.name, [results]);
      },
      error: function(result, error) {
        self.players = null;
        $.event.trigger('dataLoadFailed.' + self.name, [result]);
      }
    });
  };

  Parser.prototype.setQueryParameters = function(query){
    query.limit(1000);
    return query;
  };

  /**
   * Processes data to a friendly json format
   */ 
   Parser.prototype.processResults = function(results) {
    var self = this;
      $.each(results, function(){
        var obj = self.processResult_(this);
        self.localData.jsonById[obj.id] = obj;
        self.localData.dataById[obj.id] = this;
      });
      self.triggerLoadedEvent();
   };

   Parser.prototype.triggerLoadedEvent = function(){
    $.event.trigger('dataLoadedAndProcessed.' + this.name, [this.localData]);
   };

   /**
    * Returns the formatted JSON result
    */
   Parser.prototype.processResult_ =function(result){
    // intentionally empty
   };
   window.Parser = Parser;

/**
 * PlayerParser Constructor
 * @param {[type]} options [description]
 */
  var PlayerParser = function() {
    window.Parser.call(this);
    this.name = 'Player';
    this.init();
    this.load();
  };
  window.inherits(PlayerParser, window.Parser);

  PlayerParser.prototype.processResult_ = function(result){
    return {
      id: result.id,
      firstName: result.get('firstName'),
      lastName: result.get('lastName'),
      number: result.get('number'),
      positions: result.get('positions')
    };
  };

  PlayerParser.prototype.setQueryParameters = function(query){
    query.ascending('lastName');
    return query;
  };

  window.PlayerParser = PlayerParser;

  /**
   * GameParser Constructor
   */
  var GameParser = function() {
    window.Parser.call(this);
    this.name = 'Game';
    this.init();
    this.load();
  };
  window.inherits(GameParser, window.Parser);
  
  GameParser.prototype.processResult_ = function(result){
    return {
      id : result.id,
      field: result.get('field'),
      dateTime: result.get('dateTime'),
      opponent: result.get('opponent'),
      week: result.get('week'),
      result: result.get('Result')
    };
  };

  GameParser.prototype.setQueryParameters = function(query){
    query.ascending('dateTime');
    return query;
  };

  window.GameParser = GameParser;

  /**
   * PositionParser Constructor
   */
  var PositionParser = function(){
    window.Parser.call(this);
    this.name = 'Position';
    this.init();
    this.load();
  };

  window.inherits(PositionParser, window.Parser);
  PositionParser.prototype.processResult_ = function(result){
    return {
      id: result.get('PosId'),
      name: result.get('Name'),
      posId: result.get('PosId'),
      abbrev: result.get('Abbrev')
    };
  };

  var GamePlayersParser = function(){
    window.Parser.call(this);
    this.name = 'GamePlayer';
    this.localData.jsonByPlayerId = {};
    this.localData.jsonByGameId = {};
    this.localData.dataByPlayerId = {};
    this.localData.dataByGameId = {};
    this.init();
    this.load();
  };
  window.inherits(GamePlayersParser, window.Parser);
  GamePlayersParser.prototype.processResult_ = function(result){
    return {
      playerId: result.get('playerId'),
      gameId: result.get('gameId'),
      isAttending: result.get('isAttending')
    };
  };

  GamePlayersParser.prototype.processResults = function(results){
    var self = this;
    $.each(results, function(){
      var obj = self.processResult_(this);
      var playerJsonArray = self.localData.jsonByPlayerId[obj.playerId];
      var gameJsonArray = self.localData.jsonByGameId[obj.gameId];
      var gameDataArray = self.localData.dataByGameId[obj.gameId];
      var playerDataArray = self.localData.dataByPlayerId[obj.playerId];

      if (!playerJsonArray) {
        playerJsonArray = [];
      }

      if (!gameJsonArray) {
        gameJsonArray = [];
      }

      if (!gameDataArray) {
        gameDataArray = [];
      }

      if (!playerDataArray) {
        playerDataArray = [];
      }

      playerJsonArray.push(obj);
      gameJsonArray.push(obj);
      gameDataArray.push(this);
      playerDataArray.push(this);
      self.localData.jsonByPlayerId[obj.playerId] = playerJsonArray;
      self.localData.jsonByGameId[obj.gameId] = gameJsonArray;
      self.localData.dataByPlayerId[obj.playerId]= playerDataArray;
      self.localData.dataByGameId[obj.gameId] = gameDataArray;
    });
    self.triggerLoadedEvent();
  };

  window.GamePlayersParser = GamePlayersParser;

  var PlayerPositionsParser = function(){
    window.Parser.call(this);
    console.log("Here");
    this.name = 'PlayerPosition';
    this.localData.jsonByPlayerId = {};
    this.localData.jsonByPositionId = {};
    this.localData.dataByPlayerId = {};
    this.localData.dataByPositionId = {};
    this.init();
    this.load();
  };
  window.inherits(PlayerPositionsParser, window.Parser);
  PlayerPositionsParser.prototype.processResult_ = function(result){
    return {
      playerId: result.get('playerId'),
      positionId: result.get('positionId')
    };
  };

  PlayerPositionsParser.prototype.processResults = function(results){
    var self = this;
    $.each(results, function(){
      var obj = self.processResult_(this);
      self.localData.jsonByPlayerId[obj.playerId] = obj;
      self.localData.jsonByPositionId[obj.positionId] = obj;
      self.localData.dataByPlayerId[obj.playerId]= this;
      self.localData.dataByPositionId[obj.positionId] = this;
    });
    self.triggerLoadedEvent();
  };

 /*var playerParser = new PlayerParser();
  var gameParser = new GameParser();
  var positionParser = new PositionParser();
  var gamePlayersParser;
  var positionPlayersParser;

  // TESTING DATA 
  $(document).on('dataLoadedAndProcessed.Game', function(e, localData){
    console.log('Game:', localData);
    gamePlayerParser = new GamePlayersParser();
    // load gamePlayers
    $(document).on('dataLoadedAndProcessed.GamePlayer', function(e, localData){
      console.log("Game Player:", localData);
    });
  });
  $(document).on('dataLoadedAndProcessed.Player', function(e, localData){
    console.log('Player:', localData);
          positionPlayersParser = new PlayerPositionsParser();
    $(document).on('dataLoadedAndProcessed.PlayerPosition', function(e, localData){

      console.log('PositionPlayer', localData);
    });
  });

    $(document).on('dataLoadedAndProcessed.Position', function(e, localData){
    console.log('Position:', localData);
  });*/

})(window, document);


