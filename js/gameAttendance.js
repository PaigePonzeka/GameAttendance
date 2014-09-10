(function(){
	var GameAttendance = function(){
		this.options = {};
		this.Player = Parse.Object.extend("Player");
		this.Game = Parse.Object.extend("Game");
		this.GamePlayer = Parse.Object.extend('GamePlayer');
		this.local ={};
		this.local.players = {};
		this.local.allGames = {};
		this.local.gamePlayersAttendance = {};
		this.init();
	};

	GameAttendance.prototype.init = function(){
		Parse.initialize("q6NTBFdYRPR1oLOCDKVPTOEu14oRjFoFZFrh4Zks", "OA99A6vm4sKw0HfTUFtH9AbTC7qfVUto5K1auETq");
		this.containers = {};
		this.containers.playerList = $('.js-player-list-container');
		this.containers.playerInfo = $('.js-player-info-container');
		this.containers.gameList = $('.js-game-list-container');
		this.players = null;
		this.currentPlayer = {};
		this.loadGames();
		this.loadPlayers();
		this.bindActions();
		//this.createGamePlayer('o1l8G900jk', 'bogHakqZX4', true);
		//this.createPlayerGameRelation('o1l8G900jk', 'bogHakqZX4', true);
		//this.createGamePlayer('o1l8G900jk', 'bogHakqZX4', true);
		//this.createGamePlayer('o1l8G900jk', 'bogHakqZX4', false);
		//this.createGame(new Date("September 20, 2014 12:00:00 EST"), "Randall's Island Field #13", "Beavers");
		//this.createGame(new Date("September 27, 2014 1:30:00 EST"), "Randall's Island Field #19 ", "B-Bombers");
		//this.createGame(datetime, "Randall's Island Field #33", "Majestic Thunder");
		//this.createGame(datetime, "Randall's Island Field #18", "Hell Cats");
		//this.createGame(datetime, "Randall's Island Field #34", "Venom");
		//this.createPlayer("Katy", "Mess", 17);
		//this.createPlayer("Test", "Player", 33);
	};

	/** 
	 * Create a test Player and Game Relation
	 */
	/*GameAttendance.prototype.createPlayerGameRelation = function(playerId, gameId, isAttending){
		var testPlayer,
		testGame,
		self = this;

		var query = new Parse.Query(this.Player);
		query.get(playerId, {
		  success: function(player) {
		  	testPlayer = player;
		    // The object was retrieved successfully.
		  }
		});
		var gameQuery = new Parse.Query(this.Game);
		gameQuery.get(gameId, {
		  success: function(game) {
		  	testGame = game;
		  	self.createGamePlayer(testPlayer, game, isAttending);
		    // The object was retrieved successfully.
		  }
		});
	};*/

	/**
	 * Show list of players on the view
	 */
	GameAttendance.prototype.showPlayerList = function(){
		var self = this;
		if (this.players) {
			var list = $('<ul />');

			$.each(this.players, function() {
				var listItem = $('<li />');
				var playerLink = $('<a />', {
					'class': 'js-player-link',
					'data': {'player-id': this.id},
					'href': '#', 
					'text': ' #' + this.get('number') + ' ' + this.get("firstName") + ' ' + this.get("lastName")
				});
				listItem.html(playerLink);
				list.append(listItem);
				// save each player to localplayers
				self.local.players[this.id] = this;
			});
			this.containers.playerList.html(list);
		} else {
			this.containers.playerList.html("Error: Failed to Load Player Data");
		}
	};

	/**
	 * bind event listeners 
	 */
	GameAttendance.prototype.bindActions = function() {
		var self = this;
		// when a user clicks a player name
		$('.js-player-list-container').on('click', '.js-player-link', function(e){
			e.preventDefault();
			self.local.gamePlayers = {};
			// set the currentPlayer 
			self.currentPlayer.Id = $(this).data('player-id');
			self.currentPlayer.info = $(this).html();
			// show the current Player info
			console.log(self.currentPlayer);
			self.showPlayerInfo();
		});

		$('.js-back-to-playerlist').on('click', function(){
			self.containers.playerList.show();
			self.containers.playerInfo.hide();
			self.currentPlayer = {};
		});
	};

	/**
	 * Iterate through EVERY game, if it exists in the PlayerGame 
	 * table then there's a response, show that, otherwise show and empty game
	 */
	GameAttendance.prototype.showPlayerGameData = function(){
		console.log("Showing Player Data");
		var gamesList = $('<ul/>'),
				self = this;
		console.log("Here");
		console.log(this.local);
		$.each(this.local.allGames, function(key, value){
			console.log("games");
			var gameListItem = $('<li />', {
				text: this.get('dateTime') + ' ' + this.get('field') + ' vs ' + this.get('opponent')
			});
			// create game info
			if (self.local.gamePlayersAttendance[key]) {
				//game.playerAttending = 
				console.log("Player Data exists");
				gameListItem.addClass('playerAttendingGame');
			} else {
				// add buttons
			}
			console.log('game list item', gameListItem);
			gamesList.append(gameListItem);
		});	
		console.log(gamesList);
		this.containers.gameList.html(gamesList).show();
	};
	/**
	 *
	 */
	GameAttendance.prototype.showPlayerInfo = function(){
		this.containers.playerList.hide();
		this.containers.playerInfo.show();
		this.containers.playerInfo.find('.js-player-name').html(this.currentPlayer.info);
		// show Game data
		//this.showGameData();
		// get player specific game Info
		console.log(this.currentPlayer.Id);
		console.log(this.local.players[this.currentPlayer.Id]);
		this.loadPlayerGames(this.currentPlayer.Id);
	};

	/**
	 * Creates Games
	 */
	GameAttendance.prototype.createGame = function(dateTime, field, opponent) {
				// Create a new instance of that class.
		var game = new this.Game();
		var gameData = {
			'dateTime' : dateTime, 
			'field' : field,
			'opponent' : opponent
		};
		// TODO(Paige) set player position?

		game.save(gameData, {
			success: function(game) {
				console.log("Game saved!");
			},
			error: function(game, error) {
				console.log("You done fucked up!");
			}
		});
	};

	/**
	 * Queries for the list of all of a Players Games
	 */
	GameAttendance.prototype.loadPlayerGames = function(playerId) {
		// query for all playerGames where playerId = playerId
		console.log("load player games");
		var self = this;
		var query = new Parse.Query(this.GamePlayer);
		query.equalTo('playerId', playerId);
		query.find({
		  success: function(results) {
		  	console.log("Loading Games", results);
		  	//self.games = results;
		  	$.each(results, function(){
		  		self.local.gamePlayersAttendance[this.get('gameId')] = this.get('isAttending'); 
		  	});
		  	self.showPlayerGameData();
		  },
		  error: function(object, error) {
		    // The object was not retrieved successfully.
		    // error is a Parse.Error with an error code and message.
		    console.log("There had been some error!", error);
		    self.local.gamePlayers = {};
		  }});
		
		// later we'll iterate though all the games and find a player game association
	};

	/**
	 * Sets the Attendance data for a player
	 */
	GameAttendance.prototype.createGamePlayer = function(playerId, gameId, isAttending) {
		// Create a new instance of that class.
		var gamePlayer = new this.GamePlayer();
		gamePlayer.set('isAttending', isAttending);
		gamePlayer.set('gameId', gameId);
		gamePlayer.set('playerId', playerId);

		gamePlayer.save();
	};

	/**
	 * Show the game data and save it locally
	 */
	GameAttendance.prototype.setGameData = function() {
		var self = this;
		if (this.games) {
			$.each(this.games, function() {
				/*var gameListItem = $("<li />", {
					text: this.get('dateTime') + ' ' + this.get('field')
				});
				gameList.append(gameListItem);*/
				self.local.allGames[this.id] = this; 
			});	

			// store local game data 

			//this.containers.gameList.html(gameList);
		}
	};

	/**
	 * Load all the games 
	 */ 
	GameAttendance.prototype.loadGames = function() {
		// TODO check to see if the player has any player attendance connections with all the games
		// gets all the stored players
		var self = this;
		var query = new Parse.Query(this.Game);
		query.ascending("dateTime");
		query.find({
		  success: function(results) {
		  	console.log("Loading Games", results);
		  	self.games = results;
		    self.setGameData();
		  },
		  error: function(object, error) {
		    // The object was not retrieved successfully.
		    // error is a Parse.Error with an error code and message.
		    self.players = null;
		  }});
		return query;
	};

	/**
	 * Run Query to load players
	 */
	GameAttendance.prototype.loadPlayers = function(){
		// gets all the stored players
		var self = this;
		var query = new Parse.Query(this.Player);
		query.find({
		  success: function(results) {
		  	self.players = results;
		    self.showPlayerList();
		  },
		  error: function(object, error) {
		    // The object was not retrieved successfully.
		    // error is a Parse.Error with an error code and message.
		    self.players = null;
		    self.showPlayerList();
		  }});
		return query;
	};
	/**
	 * Saves a player information to the parse server
	 */
	GameAttendance.prototype.createPlayer = function(firstName, lastName, jerseyNumber) {
		// Create a new instance of that class.
		var player = new this.Player();
		var playerData = {
			'firstName' : firstName, 
			'lastName' : lastName,
			'number' : jerseyNumber
		}
		// TODO(Paige) set player position?

		player.save(playerData, {
			success: function(player) {
				console.log(player);
				console.log("Player saved!");
			},
			error: function(player, error) {
				console.log("You done fucked up!");
			}
		});
	};

	var gameAttenaces = new GameAttendance();
}());
