(function(){
	var GameAttendance = function(){
		this.options = {};
		this.Player = Parse.Object.extend("Player");
		this.Game = Parse.Object.extend("Game");
		this.GamePlayer = Parse.Object.extend('GamePlayer');
		this.local ={};
		this.local.players = {};
		this.local.allGames = {};
		this.local.allPlayers = {};
		this.local.attendanceByPlayer = [];
		this.local.attendanceByGame = [];
		this.init();
	};

	GameAttendance.prototype.init = function(){
		Parse.initialize("q6NTBFdYRPR1oLOCDKVPTOEu14oRjFoFZFrh4Zks", "OA99A6vm4sKw0HfTUFtH9AbTC7qfVUto5K1auETq");
		this.containers = {};
		this.containers.playerList = $('.js-player-game-list-container');
		this.containers.playerInfo = $('.js-player-info-container');
		this.containers.gameList = $('.js-player-game-list-container');
		this.containers.gameInfo = $('.js-game-info-container');
		this.containers.index = $('.js-index-container');
		this.templates = {};
		this.templates.gamesList = Handlebars.compile($('#game-template').html());
		this.templates.playerList = Handlebars.compile($('#player-template').html());
		this.players = null;
		this.currentPlayer = {};
		this.loadGames();
		this.loadPlayers();
		this.bindActions();
		this.urlParams = this.parseUrl();
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
	 * parses the data from the url (if there is any) and shows the appropiate screen
	 */
	GameAttendance.prototype.parseUrl = function() {
		var params = window.location.search.replace('?', '');
		var splitParams = params.split('=');
		var urlValues = {};
		if (splitParams.length > 1) {
			var urlValues = {};
			urlValues[splitParams[0]] = splitParams[1];
		}
		return urlValues;
	};

	/**
	 * Updates the url with the parameters given in an object
	 */
	GameAttendance.prototype.updateUrl = function(updateValues) {
		var paramBase = '',
				index = 0,
				url = window.location.href;
		if(updateValues) {
			paramBase = '?';
			$.each(updateValues, function(key, value) {
				index++;
				paramBase += key + '=' + value;
				if (index == updateValues.length - 1 ) {
					paramBase += '&';
				}
			});
		} 
		 history.pushState({}, "", window.location.pathname + paramBase);
	};
	/**
	 * bind event listeners 
	 */
	GameAttendance.prototype.bindActions = function() {
		var self = this;
		// when a user clicks a player name
		$('.js-player-list-container').on('click', '.js-update-player-btn', function(e){
			e.preventDefault();
			var playerId = $(this).data('player-id');
			self.updateUrl({"playerid" : playerId});
			self.showPlayerView(playerId);
		});

		$('.js-back-to-playerlist').on('click', function(e){
			e.preventDefault();
			self.containers.index.show();
			self.containers.playerInfo.hide();
			self.containers.gameInfo.hide();
			self.resetPlayerValues();
			self.updateUrl();
		});

		$('.js-player-game-list-container').on('click', '.js-player-yes-btn, .js-player-no-btn', function(){
			// update the playerGame relationship
			var playerId = self.currentPlayer.Id,
					$this = $(this),
					gameId	= $this.data('game-id');

			self.attendanceButtonAction(playerId, gameId, $this);
		});

		$('.js-game-info-container').on('click', '.js-player-yes-btn, .js-player-no-btn', function(){
			var $this = $(this),
					playerId = $this.data('player-id'),
					gameId	= $('.js-game-info-container').find('.js-game-name').attr('data-game-id');
					
					self.attendanceButtonAction(playerId, gameId, $this);
		});

		$('.js-game-list-container').on('click', '.js-show-game-btn', function(e){
			e.preventDefault();
			var currentGameId = $(this).data('game-id');
			// get the gameId and show the current game view
			self.currentGame = currentGameId;
			self.showGameView(currentGameId);

			self.updateUrl({"gameid" : currentGameId});
		});
	};

	GameAttendance.prototype.attendanceButtonAction = function(playerId, gameId, $button) {
		var isAttending = false;

		if ($button.hasClass('js-player-yes-btn')) {
				isAttending = true;
			}
			// change the view to show that data is loading
			var setRowClass = function(isAttending){
				$button.closest('.js-game-player-row').toggleClass('game-attending-row', isAttending);
				$button.closest('.js-game-player-row').toggleClass('game-not-attending-row', !isAttending);
			}

			this.savePlayerGame(playerId, gameId, isAttending, setRowClass(isAttending));
			var $parent = $button.closest('.js-player-list-container');
			this.getAndSetTotalPlayerCount($parent);
	};

	/**
	 * Set the Total Player count
	 */
	GameAttendance.prototype.getAndSetTotalPlayerCount = function($parent){
		var count = $parent.find('.js-game-player-row.game-attending-row').length;
		$('.js-player-count').html(count);
	};

	/**
	 * -------- Update Views -------
	 */
	/**
	 * Shows the Single Game View With a list of players and their attendance
	 */
	GameAttendance.prototype.showGameView = function(currentGameId){
		this.containers.gameInfo.show();
		this.containers.index.hide();
		var currentGame = this.local.allGames[currentGameId];
		this.containers.gameInfo.find('.js-game-name')
				.attr('data-game-id', currentGameId)
				.html(this.formatDate(currentGame.dateTime) + ' on ' + currentGame.field + ' vs ' + currentGame.opponent);
	

		this.loadPlayerGames(null, currentGameId);
	};	


	/**
	 * Show Player Info
	 */
	GameAttendance.prototype.showPlayerView = function(playerId){
		this.local.gamePlayers = {};
		this.currentPlayer.Id = playerId;
		this.containers.index.hide();
		this.containers.playerInfo.show();
		console.log(this.local.allPlayers[playerId]);
		console.log(this.local);
		var playerName = this.local.allPlayers[playerId].firstName + ' ' + this.local.allPlayers[playerId].lastName;
		this.containers.playerInfo.find('.js-player-name').html(playerName);
		this.loadPlayerGames(this.currentPlayer.Id);
	};

	/**
	 * Iterate through EVERY game, if it exists in the PlayerGame 
	 * table then there's a response, show that, otherwise show and empty game
	 */
	GameAttendance.prototype.showPlayerGameData = function(){
		var self = this;
		var localGames = this.local.allGames;
		
		$.each(this.local.allGames, function(key, value){
			var game = this;
			if(self.local.attendanceByGame[key] != undefined) {
				game.isAttending = self.local.attendanceByGame[key].get('isAttending');
			} else {
				game.isAttending = undefined;
			}
		});
		var gamesList = this.templates.gamesList(this.local);
		this.containers.gameList.html(gamesList).show();
	};

	/**
	 * Iterate through EVERY player, if the player details exist they're attending the game
	 * table then there's a response, show that, otherwise show and empty game
	 */
	GameAttendance.prototype.showGamePlayerData = function(){
		var self = this;
		var localPlayers = this.local.allPlayers;
		
		$.each(this.local.allPlayers, function(key, value){
			var player = this;
			var currentAttendance = self.local.attendanceByPlayer[key];
			if(currentAttendance != undefined) {
				player.isAttending = currentAttendance.get('isAttending');
			} else {
				player.isAttending = undefined;
			}
		});
		var playerList = this.templates.playerList(this.local);
		$('.js-game-info-container .js-player-list-container').html(playerList).show();
		this.getAndSetTotalPlayerCount($('.js-game-info-container .js-player-list-container'));
	};

	/**
	 * Populate the gamelist container with the game data
	 */
	GameAttendance.prototype.showGameData = function() {
		var data = {
			allGames : this.local.allGames,
			isMainScreen: true
		};
		var gamesList = this.templates.gamesList(data);
		$('.js-game-list-container').html(gamesList).show();
	};

	/**
	 * Show list of players on the view
	 */
	GameAttendance.prototype.showPlayerList = function(onMainScreen, $parent){
		var data = {
			allPlayers : this.local.allPlayers,
			isMainScreen: onMainScreen
		};
		var playerList = this.templates.playerList(data);
		if ($parent) {
			$parent.find('.js-player-list-container').html(playerList);
		} else {
			$('.js-player-list-container').html(playerList);			
		}

		var self = this;
	};


	/** 
	 * ------ Database Updates --------
	 */
	/**
	 * Save a Player Game Relationship to the data ase (updates or creates a new one if it already exists)
	 */
	GameAttendance.prototype.savePlayerGame = function(playerId, gameId, isAttending, callback) {
		var gamePlayer = {};

		if (this.local.attendanceByGame[gameId]) {
			gamePlayer = this.local.attendanceByGame[gameId];
		} else {
			gamePlayer = new this.GamePlayer();
			gamePlayer.set('playerId', playerId);
			gamePlayer.set('gameId', gameId);
		}
		gamePlayer.set('isAttending', isAttending);

		gamePlayer.save(null, {
		  success: function(gamePlayer) {
		    if (typeof callback === 'function') {
		    	callback();
		    }
		  }
		});
	};


	/**
	 * Creates Games and saves them to the database
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
				console.log("Error Creating Game", error);
			}
		});
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
				console.log("Player saved!");
			},
			error: function(player, error) {
				console.log("Error Creating Player", error);
			}
		});
	};

	/**
	 * ------------------ Queries ---------------------
	 */
	/**
	 * Queries for the list of all of a Players Games
	 */
	GameAttendance.prototype.loadPlayerGames = function(playerId, gameId) {
		// query for all playerGames where playerId = playerId
		var self = this;
		var query = new Parse.Query(this.GamePlayer);
		if (playerId) {
			query.equalTo('playerId', playerId);
		} else if(gameId) {
			query.equalTo('gameId', gameId);
		}
		query.find({
		  success: function(results) {
		  	$.each(results, function(){
		  			self.local.attendanceByPlayer[this.get('playerId')] = this; 
		  			self.local.attendanceByGame[this.get('gameId')] = this; 
		  		});
		  	if (playerId) {
		  		self.showPlayerGameData();
				} else if(gameId) {
					self.showGamePlayerData();
				}
		  },
		  error: function(object, error) {
		    console.log("Error Loading Game Players", error);
		    self.local.gamePlayers = {};
		  }});
	};

	/**
	 * Load all the games fro the database
	 */ 
	GameAttendance.prototype.loadGames = function() {
		// TODO check to see if the player has any player attendance connections with all the games
		// gets all the stored players
		var self = this;
		var query = new Parse.Query(this.Game);
		query.ascending("dateTime");
		query.find({
		  success: function(results) {
		  	self.games = results;
		    self.setGameData();
		  },
		  error: function(object, error) {
		    console.log("Error Loading Games", error);
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
		query.ascending('lastName');
		query.find({
		  success: function(results) {
		  	self.local.players = results;
		    self.setPlayerData();
		  },
		  error: function(object, error) {
		    self.players = null;
		    console.log("Error Loading Players", error);
		  }});
		return query;
	};

	/**
	 * Update the game data
	 */
	GameAttendance.prototype.setGameData = function() {
		var self = this;
		if (this.games) {
			$.each(this.games, function() {
				var gameData = {
					id : this.id,
					field: this.get('field'),
					dateTime: this.get('dateTime'),
					opponent: this.get('opponent')
				};

				self.local.allGames[this.id] = gameData; 
			});	

			if(self.urlParams.gameid) {
				// show the game view
				this.showGameView(self.urlParams.gameid);
			}
		}
		self.showGameData();
	};

	/**
	 * Sets the player data object
	 */
	GameAttendance.prototype.setPlayerData = function(){
		var self = this;
		if (this.local.players) {
			$.each(this.local.players, function() {
				var playerData= {
					id: this.id,
					firstName: this.get('firstName'),
					lastName: this.get('lastName'),
					number: this.get('number')
				};

				self.local.allPlayers[this.id] = playerData; 
			});	
			self.parseUrl();
			if (self.urlParams.playerid) {
				// show the player view
				this.showPlayerView(self.urlParams.playerid);
			}
		}
		self.showPlayerList(true, this.containers.index);
	};

	GameAttendance.prototype.resetPlayerValues = function(){
		this.local.currentPlayer = {};
	};

	/**
	 * ---------------- Utilities ---------------
	 */
	GameAttendance.prototype.formatDate = function(date) {
		return moment(date).format('ddd, MMM D YYYY, h:mm A');
	};
	
	// format date 
	Handlebars.registerHelper("formatDate", function(date) {
		return moment(date).format('ddd, MMM D YYYY, h:mm A');
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
	var gameAttendances = new GameAttendance();
}());
