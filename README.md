GameAttendance
==============

Uses Parse to keep track of player attendance to a set schedule of games. 

Data:

Game:
  dateTime
  field
  opponent

Player
  firstName
  lastName
  number
  
GamePlayers
  playerId
  gameId
  isAttending (Boolean)
  
  
Uses: Parse, Handlebars, twitter bootstrap, compass, Moment, Jquery
