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


  /********************************
   * Parser Constructor
   ********************************/
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
    data = this.beforeSave_(data);
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
   * If later parsers need to customize or preprocess data before they save it
   */
  Parser.prototype.beforeSave_ = function(data){
    // intentionally empty
  };

  /**
   * Queries for all of the data items at the database
   */
  Parser.prototype.load = function() {
    var self = this;
    var query = new Parse.Query(this.dataObject);
    query = this.setQueryParameters(query);
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

  /**
   * Uses the set params to query on the object
   * Current structure {'colunmName or Ascending', 'value or ascendingColumn'}
   * @param {object} query Parse query object
   */
  Parser.prototype.setQueryParameters = function(query){
    if (this.options.params) {

      // single query
      $.each(this.options.params, function(key, value){
        if (key === 'ascending') {
          query.ascending(value);
        } else {
          query.equalTo(key, value);
        }
      });
    }
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

   Parser.prototype.createMsgObject = function(isValid, msg){

    return {
      'isValid': isValid,
      'msg': msg
    };

   };

   window.Parser = Parser;


  /********************************
   * PlayerParser Constructor
   ********************************/
  var PlayerParser = function(options) {
    this.defaults = {
      params: {
        ascending: 'lastName'
      }
    };
    window.Parser.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
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

  window.PlayerParser = PlayerParser;

  /********************************
   * GameParser Constructor
   ********************************/
  var GameParser = function(options) {
    this.defaults = {
      params : {
        ascending: 'dateTime'
      }
    };
    window.Parser.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
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
  window.GameParser = GameParser;

  /********************************
   * PositionParser Constructor
   ********************************/
  var PositionParser = function(options){
    window.Parser.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
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
  window.PositionParser = PositionParser;

  /********************************
   * GamePlayersParser Constructor
   ********************************/
  var GamePlayersParser = function(options){
    window.Parser.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
    this.name = 'GamePlayer';
    this.localData.jsonByPlayerId = {};
    this.localData.jsonByGameId = {};
    this.localData.dataByPlayerId = [];
    this.localData.dataByGameId = [];
    this.localData.databyPlayerIdGameId = [];
    this.init();
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
      var playerGameArray = self.localData.databyPlayerIdGameId[obj.playerId + '-' + obj.gameId];
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

      if (!playerGameArray) {
        playerGameArray = [];
      }

      playerJsonArray.push(obj);
      gameJsonArray.push(obj);
      gameDataArray.push(this);
      playerDataArray.push(this);
      playerGameArray.push(this);
      self.localData.jsonByPlayerId[obj.playerId] = playerJsonArray;
      self.localData.jsonByGameId[obj.gameId] = gameJsonArray;
      self.localData.dataByPlayerId[obj.playerId]= playerDataArray;
      self.localData.dataByGameId[obj.gameId] = gameDataArray;
      self.localData.databyPlayerIdGameId[obj.playerId + '-' + obj.gameId] = playerGameArray;
    });
    self.triggerLoadedEvent();
  };

  GamePlayersParser.prototype.updateOrCreate = function(data, callback){
    var gamePlayer = {};

    if (data.playerId && data.gameId) {
      gamePlayer = this.localData.databyPlayerIdGameId[data.playerId + '-' + data.gameId];
    }

    if (!gamePlayer) {
      gamePlayer = new this.dataObject();
      gamePlayer.set('playerId', data.playerId);
      gamePlayer.set('gameId', data.gameId);
    } else {
      gamePlayer = gamePlayer[0];
    }
    gamePlayer.set('isAttending', data.isAttending);
    gamePlayer.save(null, {
      success: function(gamePlayer) {
        if (typeof callback === 'function') {
          callback();
        }
      }
    });
  };
  window.GamePlayersParser = GamePlayersParser;

  /********************************
   * PlayerPositionsParser Constructor
   ********************************/
  var PlayerPositionParser = function(options){
    window.Parser.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
    this.name = 'PlayerPosition';
    this.localData.jsonByPlayerId = {};
    this.localData.jsonByPositionId = {};
    this.localData.dataByPlayerId = {};
    this.localData.dataByPositionId = {};
    this.localData.databyPlayerIdPositionId = {};
    this.init();
    this.load();
  };
  window.inherits(PlayerPositionParser, window.Parser);
  PlayerPositionParser.prototype.processResult_ = function(result){
    return {
      playerId: result.get('playerId'),
      positionId: result.get('positionId'),
      isPosition: result.get('isPosition')
    };
  };

  PlayerPositionParser.prototype.processResults = function(results){
    var self = this;
    $.each(results, function(){
      // TODO(paige) Fix this to support arrays (currently overrides)
      var obj = self.processResult_(this);
      self.localData.jsonByPlayerId[obj.playerId] = obj;
      self.localData.jsonByPositionId[obj.positionId] = obj;
      self.localData.dataByPlayerId[obj.playerId]= this;
      self.localData.dataByPositionId[obj.positionId] = this;
      self.localData.databyPlayerIdPositionId[obj.playerId + '-' + obj.positionId] = this;
    });
    self.triggerLoadedEvent();
  };

  PlayerPositionParser.prototype.updateOrCreate = function(data, callback){
    var playerPosition;
    if (data.playerId && data.positionId) {

      playerPosition = this.localData.databyPlayerIdPositionId[data.playerId + '-' + data.positionId];
    }

    if (!playerPosition) {
      playerPosition = new this.dataObject();
      playerPosition.set('playerId', data.playerId);
      playerPosition.set('positionId', data.positionId);
    } else {
      playerPosition = playerPosition;
    }

    playerPosition.set('isPosition', data.isPosition);
    playerPosition.save(null, {
      success: function(playerPosition) {
        if (typeof callback === 'function') {
          callback();
        }
      }
    });
  };
  
  var ManagerParser = function(options) {
    window.Parser.call(this);
    this.options = $.extend(true, {}, this.defaults, options);
    this.name = 'Manager';
    this.init();

  };
  window.inherits(ManagerParser, window.Parser);

  ManagerParser.prototype.processResult_ = function(result){
    return {
      id: result.id,
      email: result.get('email')
    };
  };

  ManagerParser.prototype.message = {
    error : {
      invalidEmail: "Please enter a valid email address",
      invalidPassword : "Please enter a valid password",
      duplicateEmail : "There is already and account with this email address. Please Login"
    }
  };
  
  /**
    * Make sure the give data has valid input
    */ 
  ManagerParser.prototype.validate = function(data){
      var self = this,
      msgObject = this.createMsgObject(true); // not sure how I feel about defaulting to valid
    if (data.email !== '') {
       var isValidEmail = validateEmail(data.email);
      if (!isValidEmail) {
        msgObject = this.createMsgObject(false, self.message.error.invalidEmail);
        $.event.trigger('dataValidated.' + this.name , [msgObject]);
      } else { // make sure the manager doesn't already exists
        this.managerQuery = new ManagerParser({
          params : {
            email : data.email
          }
        }); 
        this.managerQuery.load();
        var password = data.password;
        var onManagerQueryLoaded = function(e, data){
           if ($.isEmptyObject(data.dataById)) {
             msgObject = self.validatePassword(password);
           } else {
            msgObject = self.createMsgObject(false, self.message.error.duplicateEmail);
           }
          $.event.trigger('dataValidated.' + self.name , [msgObject]);
        };
        $(document).on('dataLoadedAndProcessed.Manager', onManagerQueryLoaded);
      }
    } else {
       msgObject = this.createMsgObject(false,  self.message.error.invalidEmail);
       $.event.trigger('dataValidated.' + this.name , [msgObject]);
    }
  };

  /**
   * Returns false if the password doesn't match criteria
   * @return {obj} message object with the validation status and the error message for the user
   */
  ManagerParser.prototype.validatePassword = function(password){
    var msgObj = this.createMsgObject(true); // defaulting to true again... eick
    if (password === '') {
       msgObject = this.createMsgObject(false, this.message.error.invalidPassword);
       return msgObject;
    }
    return msgObj;
  };

  ManagerParser.prototype.beforeSave_ = function(data){
    console.log("Before Save");
    var passwordHash = CryptoJS.SHA1(data.password);
    data.password = passwordHash.toString();
    console.log(data);
    return data;
  };

  window.ManagerParser = ManagerParser;
  window.PlayerPositionParser = PlayerPositionParser;

  /**
   * Utilities
   */
   var validateEmail = function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
} 


})(window, document);


