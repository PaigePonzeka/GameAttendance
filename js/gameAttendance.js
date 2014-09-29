/*
 * TODO
 * MOBILE Friendly?
 * Clear out current games
 * Send to Team
 */

(function(){
	Parse.initialize("q6NTBFdYRPR1oLOCDKVPTOEu14oRjFoFZFrh4Zks", "OA99A6vm4sKw0HfTUFtH9AbTC7qfVUto5K1auETq");
	var GameAttendance = function(options){
		this.options = $.extend(true, {}, this.defaults, options);
		this.options.onMainScreen = true;
		this.Game = Parse.Object.extend("Game");
		this.GamePlayer = Parse.Object.extend('GamePlayer');
		this.local ={};
		this.local.allGames = {};
		this.local.attendanceByPlayer = [];
		this.local.attendanceByGame = [];
		this.local.attendanceByGameByPlayer = {};
		this.init();
	};

	GameAttendance.prototype.init = function(){
		//Parse.initialize("q6NTBFdYRPR1oLOCDKVPTOEu14oRjFoFZFrh4Zks", "OA99A6vm4sKw0HfTUFtH9AbTC7qfVUto5K1auETq");
		this.containers = {};
		this.containers.playerList = $('.js-player-game-list-container');
		this.containers.playerInfo = $('.js-player-info-container');
		this.containers.gameList = $('.js-player-game-list-container');
		this.containers.gameInfo = $('.js-game-info-container');
		this.containers.index = $('.js-index-container');
		this.templates = {};
		this.templates.gamesList = Handlebars.compile($('#game-template').html());
		this.players = null;
		this.currentPlayer = {};
		this.loadGames();
		this.bindActions();
		this.Players = new Players(); // loading Players Object
		this.urlParams = this.parseUrl();
		//this.createGamePlayer('o1l8G900jk', 'bogHakqZX4', true);
		//this.createPlayerGameRelation('o1l8G900jk', 'bogHakqZX4', true);
		//this.createGamePlayer('o1l8G900jk', 'bogHakqZX4', true);
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

		/*
		 * Show the loaded Player Data to the screen
		 */
		$(document).on('dataLoadedAndParsed.players', function(e, playerData){
			playerData.isMainScreen = self.options.onMainScreen;
			playerData.mode = self.options.mode;
			$('.js-player-list-container').html(self.Players.createPlayerTable(playerData));
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
		var link = this.containers.gameInfo.find('.js-attendance-list-btn').data('link-prepend');
		link += currentGameId;

		this.containers.gameInfo.find('.js-attendance-list-btn').attr('href', link);
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
		this.local.attendanceByPlayer = {};
		this.local.attendanceByGame = {};
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
		this.containers.gameList.html(gamesList).hide();
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
		var localPlayers = this.Players.local.allPlayers;
		$('.js-game-info-container .js-player-list-container').hide();
		$.each(this.Players.local.allPlayers, function(key, value){
			var player = this;
			var currentAttendance = self.local.attendanceByPlayer[key];
			if(currentAttendance != undefined) {
				player.isAttending = currentAttendance.get('isAttending');
			} else {
				player.isAttending = undefined;
			}
		});
		var playerList = this.Players.createPlayerTable(this.Players.local);
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
			isMainScreen: onMainScreen,
			mode: this.options.mode
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
		if (playerId && gameId) {
			gamePlayer = this.local.attendanceByGameByPlayer[gameId + '-' + playerId];
		} 

		if(!gamePlayer) {
			gamePlayer = new this.GamePlayer();
			gamePlayer.set('playerId', playerId);
			gamePlayer.set('gameId', gameId);
		}
		gamePlayer.set('isAttending', isAttending);
		gamePlayer.save(null, {
		  success: function(gamePlayer) {
		  	console.log("game Status saved!", gamePlayer);
		    if (typeof callback === 'function') {
		    	callback();
		    }
		  }
		});
	};


	/**
	 * Creates Games and saves them to the database
	 */
	GameAttendance.prototype.createGame = function(dateTime, field, opponent, week) {
				// Create a new instance of that class.
		var game = new this.Game();
		var gameData = {
			'dateTime' : dateTime, 
			'field' : field,
			'opponent' : opponent,
			'week': week,
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
		self.local.attendanceByPlayer = {}; 
		self.local.attendanceByGame = {}; 
		self.local.attendanceByGameByPlayer = {};
		query.find({
		  success: function(results) {
		  	$.each(results, function(){
		  			self.local.attendanceByPlayer[this.get('playerId')] = this; 
		  			self.local.attendanceByGame[this.get('gameId')] = this; 
		  			self.local.attendanceByGameByPlayer[this.get('gameId') + '-' + this.get('playerId')] = this;
		  		});
		  	if (playerId) {
		  		self.showPlayerGameData();
				} else if(gameId) {
					self.showGamePlayerData();
				}

				console.log(self.local);
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
					opponent: this.get('opponent'),
					week: this.get('week'),
					result: this.get('Result')
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


	GameAttendance.prototype.resetPlayerValues = function(){
		this.local.currentPlayer = {};
	};

	/**
	 * ---------------- Utilities ---------------
	 */
	GameAttendance.prototype.formatDate = function(date) {
		return moment(date).format('ddd, MMM D YYYY, h:mm A');
	};

	/**
	 * Players Constructor
	 */
	var Players = function(options){
		this.options = $.extend(true, {}, this.defaults, options);
		this.Player = Parse.Object.extend("Player");
		this.local = {};
		this.local.players = {};
		this.local.allPlayers = {};
		//this.playerListTemplate = Handlebars.compile($('#player-template').html());
		this.loadPlayers();
	};

	/**
	 *	Generates Player List Table and returns html to be appended to view
	 */
	/*Players.prototype.createPlayerTable = function(data) {
		return this.playerListTemplate(data);
	};*/

	/**
	 * Set the Player data to a more friendly JSON format for Handlebars
	 */
	Players.prototype.setPlayerData = function(){
		var self = this;
		if (this.local.players) {
			$.each(this.local.players, function() {
				var playerData= {
					id: this.id,
					firstName: this.get('firstName'),
					lastName: this.get('lastName'),
					number: this.get('number'),
					positions: this.get('positions')
				};
				self.local.allPlayers[this.id] = playerData; 
			});
			console.log(JSON.stringify(self.local.allPlayers));
			$.event.trigger('dataLoadedAndParsed.players', [self.local]);
		}
	};

	/**
	 *  Load the players from the database
	 * 
	 */
	Players.prototype.loadPlayers = function(){
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
		    $.event.trigger('dataLoadFailed.players', [self.local]);
		  }
		});
		return query;
	};

	var Positions = function(options) {
		this.options = $.extend(true, {}, this.defaults, options);
		this.PositionObj = Parse.Object.extend("Position");
		this.local = {};
		this.local.allPositions = {};
		this.loadPositions();
	};

	/**
	 *  Load the Positions from the database
	 * 
	 */
	Positions.prototype.loadPositions = function(){
		// gets all the stored players
		var self = this;
		var query = new Parse.Query(this.PositionObj);
		query.ascending('PosId');
		query.find({
		  success: function(results) {
		  	console.log(results);
		  	self.setPositionData(results);
		  },
		  error: function(object, error) {
		    self.players = null;
		    $.event.trigger('dataLoadFailed.Positions', [self.local]);
		  }
		});
		return query;
	};

	/**
	 * Set the Player data to a more friendly JSON format for Handlebars
	 */
	Positions.prototype.setPositionData = function(data){
		var self = this;
		if (data) {
			$.each(data, function() {
				var positionData= {
					id: this.id,
					name: this.get('Name'),
					posId: this.get('PosId'),
					abbrev: this.get('Abbrev')
				};
				self.local.allPositions[this.get('PosId')] = positionData; 
			});


			$.event.trigger('dataLoadedAndParsed.positions', [self.local]);
		}
	};
	window.Positions = Positions;

	var PlayerPositions = function(options) {
		this.options = $.extend(true, {}, this.defaults, options);
		this.PlayerPositionObj = Parse.Object.extend("PlayerPosition");
		this.Players = new Players();
		this.Positions = new Positions();
		this.local = {};
		this.local.allPlayerPositions = {};
		this.local.playerPositionsObjs = {};
		this.init();
	};

	PlayerPositions.prototype.init = function(){
		/**
		 * After Players AND Positions have loaded load player positions and set data
		 */
		var self = this;
		var playersLoaded = false;
		var positionsLoaded = false;
		$(document).on('dataLoadedAndParsed.positions', function(data){
			positionsLoaded = true;
			if (playersLoaded && positionsLoaded) {
				self.load();
			}
		});

		$(document).on('dataLoadedAndParsed.players', function(data){
			playersLoaded = true;
			if (playersLoaded && positionsLoaded) {
				self.load();
			}
		});

	};

	/**
	 *  Load the Positions from the database
	 * 
	 */
	PlayerPositions.prototype.load = function(){
		// gets all the stored players
		var self = this;
		var query = new Parse.Query(this.PlayerPositionObj);
		query.find({
		  success: function(results) {
		  	self.setData(results);
		  },
		  error: function(object, error) {
		    self.players = null;
		    $.event.trigger('dataLoadFailed.PlayerPositions', [self.local]);
		  }
		});
		return query;
	};

	/**
	 * Set the Player data to a more friendly JSON format for Handlebars
	 */
	PlayerPositions.prototype.setData = function(data){
		var self = this;
		if (data) {
			$.each(data, function() {
				var currentPlayerId = this.get('playerId'),
						currentPosition = this.get('positionId');
				// if the player already has positions set just append to the array otherwise init it and append
				if (!self.local.allPlayerPositions[currentPlayerId]) {
					self.local.allPlayerPositions[currentPlayerId] = [];
				}
				self.local.playerPositionsObjs[currentPlayerId + '-' + currentPosition] = this;
				self.local.allPlayerPositions[currentPlayerId].push(currentPosition);
			});

			$.each(self.Players.local.allPlayers, function() {
				this.positions = self.local.allPlayerPositions[this.id];
			});
			console.log(JSON.stringify(self.local));
			$.event.trigger('dataLoadedAndParsed.PlayerPositions', [self.local]);
		}
	};

	/**
	 * [update description]
	 * @param  {[type]} playerId     [description]
	 * @param  {[type]} positionId   [description]
	 * @param  {[type]} savePosition [description]
	 * @return {[type]}              [description]
	 */
	PlayerPositions.prototype.update = function(playerId, positionId, savePosition){
		var playerPosition = this.local.playerPositionsObjs[playerId + '-' + positionId];
		// if the playerPosition doesn't exist create a new one
		if (!playerPosition) {
			playerPosition = new this.PlayerPositionObj();
		}

		var data = {
			'playerId' : playerId, 
			'positionId' : positionId
		};
		playerPosition.save(data, {
			success: function(data) {
				console.log("Position Saved!");
				$.event.trigger('saved.playerPositions', [data]);
			},
			error: function(player, error) {
				console.log("Error Creating Player Position", error);
			}
		});
	};

	PlayerPositions.prototype.delete = function(playerId, positionId){
		var playerPosition = this.local.playerPositionsObjs[playerId + '-' + positionId],
				self = this;

		if (playerPosition) {
			playerPosition.destroy({
				success: function(){
					self.local.playerPositionsObjs[playerId + '-' + positionId] = null;
				}
			});
		}
	};


	//player-position-template
	var PlayerPositionsView = function(options){
		this.options = $.extend(true, {}, this.defaults, options);
		this.PlayerPositions = new PlayerPositions();
		this.playerPositionListTemplate = Handlebars.compile($('#player-position-template').html());
		this.init();
		this.bindTableActions();
	};

	PlayerPositionsView.prototype.init = function(){
		var self = this;
		$(document).on('dataLoadedAndParsed.PlayerPositions', function(data) {
			self.showTable();
		});
	};

	PlayerPositionsView.prototype.bindTableActions = function() {
		var self = this;
		$('.js-player-position-list-container').on('click', '.js-position-toggle-btn', function(){
			$(this).toggleClass('btn-success').attr('disabled', 'disabled');
			// get player id
			var playerId = $(this).closest('.js-player-row').data('playerid');
			// get pos id
			var posId = $(this).data('posid');
			if ($(this).hasClass('btn-success')) {
				self.PlayerPositions.update(playerId, posId);
			} else {
				self.PlayerPositions.delete(playerId, posId);
			}
		});
	};

	PlayerPositionsView.prototype.showTable = function() {
		var data = {
				players: this.PlayerPositions.Players.local.allPlayers,
				positions: this.PlayerPositions.Positions.local.allPositions
			};
		
		$('.js-player-position-list-container').html(this.playerPositionListTemplate(data));
	};

	PlayerPositionsView.prototype.save

	window.PlayerPositionsView = PlayerPositionsView;

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

	Handlebars.registerHelper("playsPosition", function(player) {
		return $.inArray(this.posId, player.positions) >= 0;
	});
	window.GameAttendance = GameAttendance;
}());
