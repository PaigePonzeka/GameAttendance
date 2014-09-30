(function(){
  Parse.initialize("q6NTBFdYRPR1oLOCDKVPTOEu14oRjFoFZFrh4Zks", "OA99A6vm4sKw0HfTUFtH9AbTC7qfVUto5K1auETq");
  /**
   * @constructor Parser
   * Works with parse data objects from the parse library
   */
  var Parser = function(options){
    this.defaults = {
      name: 'Object'
    };
    this.localData = {};
    this.localData.jsonById = {};
    this.localData.dataById = {};
    this.options = $.extend(true, {}, this.defaults, options);
    this.init();
  };

  Parser.prototype.init = function() {
    this.dataObject = Parse.Object.extend(this.options.name);
  };

  /**
  * Saves a new Parse Object
  */
  Parser.prototype.save = function(data){
    var newObject = new this.dataObject();

    newObject.save(data, {
      success: function(result) {
        $.event.trigger('dataSaved.' + this.options.name, [result]);
      },
      error: function(result, error) {
        $.event.trigger('dataSaveError.' + this.options.name , [result]);
      }
    });
  };

  /**
   * Queries for all of the data items at the database
   */
  Parser.prototype.load = function() {
    var self = this;
    var query = new Parse.Query(this.dataObject);
    //query.ascending('lastName');
    query.find({
      success: function(results) {
        self.processResults(results);
        $.event.trigger('dataLoaded.' + self.options.name, [results]);
      },
      error: function(result, error) {
        self.players = null;
        $.event.trigger('dataLoadFailed.' + self.options.name, [result]);
      }
    });
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
      $.event.trigger('dataLoadedAndProcessed.' + self.options.name, [self.localData]);
   };

   /**
    * Returns the formatted JSON result
    */
   Parser.prototype.processResult_ =function(result){
    // intentionally empty
   };
;
  var PlayerParser = new Parser({name:'Player'});
  PlayerParser.processResult_ = function(result){
    return {
      id: result.id,
      firstName: result.get('firstName'),
      lastName: result.get('lastName'),
      number: result.get('number'),
      positions: result.get('positions')
    };
  };
  PlayerParser.load();
  //console.log("Player Data:", PlayerParser.localData);

  var GameParser = new Parser({name: "Game"});
  GameParser.processResult_ = function(result){
    return {
          id : result.id,
          field: result.get('field'),
          dateTime: result.get('dateTime'),
          opponent: result.get('opponent'),
          week: result.get('week'),
          result: result.get('Result')
    };
  };
  $(document).on('dataLoadedAndProcessed.Game', function(e, localData){
    console.log(localData);
  });
  GameParser.load();


  var PositionParser = new Parser({name: "Position"});
  PositionParser.processResult_ = function(result){
    return {
          id: result.get('PosId'),
          name: result.get('Name'),
          posId: result.get('PosId'),
          abbrev: result.get('Abbrev')
    };
  };
  $(document).on('dataLoadedAndProcessed.Position', function(e, localData){
    console.log("position", localData);
  });
  PositionParser.load();

  var PlayerPositionParser = new Parser({name: "PlayerPosition"});
  PlayerPositionParser.processResult_ = function(result){
    console.log(result);
    return {
        id: result.get('playerId') + '-' + result.get('positionId'),
        position: result.get('positionId'),
        player: result.get('playerId')
    };
  };
  $(document).on('dataLoadedAndProcessed.PlayerPosition', function(e, localData){
    console.log("Playerposition", localData);
  });
  PlayerPositionParser.load();
}());


