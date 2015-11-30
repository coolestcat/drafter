var express = require('express');
var app = express();
var uuid = require('node-uuid'); //for generating id's
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var utils = require('./utils');
var Room = require('./room');

var obj = JSON.parse(fs.readFileSync('THS_cards.json', 'utf8'));
var resp = utils.sortSet(obj);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//serve static files in public folder
app.use(express.static('public'));

// io.on('connection', function(socket){
// 	console.log('someone connected');
// 	socket.on('chat message', function(msg){
// 		io.emit('chat message', msg);
// 	});
// });

var roomList = []; // small list to emit to clients - has {"id": id, "name": name, "settings": {nPlayers: n, ..., nLands: l}} objects inside
var rooms = {}; // stores all rooms and parameters
var peopleToRoom = {};  

//Settings
// var nPlayers = 3;
// var nCommons = 0;
// var nUncommons = 0;
// var nRares = 5;
// var nLands = 0;

//room internal state
// var nextMap;
// var previousMap;

//packs = [{}, {}, {}, {}, {}, {}, {}, {}];
//numConnected = 0;
//client_ids = [];
//started = 0;
//allDone = 0;
//roundOfThree = 0;
// var counter = 0;

// packs = utils.makeRepeatedArray(nPlayers, {});
// waiting = utils.makeRepeatedArray(nPlayers, 0);



var nsp = io.of('/my-namespace');
nsp.on('connection', function(socket){
  console.log('someone connected:');
  console.log(socket.id);
  console.log(JSON.stringify(peopleToRoom));
  console.log(JSON.stringify(roomList));
  //client_ids.push(socket.id);
  peopleToRoom[socket.id] = {room: null};
  socket.emit('room list', roomList);

  //numConnected += 1;
  // var myID = counter;
  // var packNumber = counter;
  //socket.emit('chat message', 'hi everyone!');
  // socket.on('chat message', function(msg){
  // 	console.log(msg);
  // 	//socket.to('myroom0').emit('chat message', msg) // to first socket from sending socket
  // 	//socket.emit('chat message', 'ohai') // to itself
  // 	//nsp.emit('chat message', 'to everyone'); // to everyone 
  // 	//nsp.to('myroom0').emit('chat message', msg); // from server to first socket
  // 	var cards = utils.pickChosen(resp);
  // 	socket.emit('chat message', String(cards));
  // });

  socket.on('create room', function(msg){
  	console.log(JSON.stringify(msg));
  	//var room_id = roomList.length; //set room_id to be a random unique value, not roomList.length
  	var room_id = uuid.v4();
  	console.log('new room created: ' + String(room_id));
  	var new_room = new Room(msg[0], room_id, msg[1], socket.id);//name, id, settings, this clientid
  	var room_info = {
  		id: room_id,
  		name: msg[0],
  		settings: msg[1]
  	};
  	peopleToRoom[socket.id].room = room_id;
  	rooms[room_id] = new_room;
  	roomList.push(room_info);
  	nsp.emit('room list', roomList); // to everyone
  	var roomString = String(room_id);
  	socket.join(roomString); // creator of room automatically joins it
  });

  socket.on('join room', function(msg){
  	console.log('joining room: ' + String(msg));
  	if (rooms[msg].clientids.length >= rooms[msg].settings.nPlayers){
  		console.log('cannot join room - already full');
  		socket.emit('join room failure', "room already full");
  	}
  	else if (rooms[msg].inprogress){
  		console.log('cannot join room - in progress');
  		socket.emit('join room failure', "room is in progress");
  	}
  	else{
	  	peopleToRoom[socket.id].room = msg;
	  	rooms[msg].clientids.push(socket.id);
	  	socket.join(String(msg));
	  	socket.emit('join room success', ""); 		
  	}
  });

  socket.on('start', function(msg){ //when room is allDone, remove room from roomList; 
  	//if room is started but not done, show as in progress on roomList
	var room_id = peopleToRoom[socket.id].room;
	rooms[room_id].started ++;
  	if (rooms[room_id].started == rooms[room_id].settings.nPlayers){
  		//initialize waiting array
  		rooms[room_id].initialize();
  		//initialize client id to next client id maps
  		rooms[room_id].initializeRandomMaps();
  		for (i=0; i<rooms[room_id].settings.nPlayers; i++){
		  	nsp.to(rooms[room_id].clientids[i]).emit('round start', "");
  		}  		
	}
  });

  socket.on('round start ack', function(msg){
  	var room_id = peopleToRoom[socket.id].room;
  	var cards = utils.pickChosen(resp, rooms[room_id].settings.nCommons, rooms[room_id].settings.nUncommons, rooms[room_id].settings.nRares, rooms[room_id].settings.nLands);
  	rooms[room_id].packs[socket.id] = cards;
  	socket.emit('first pack', cards);
  	socket.emit('identifier', socket.id);
  });

  socket.on('card selected', function(msg){
  	var room_id = peopleToRoom[socket.id].room;
  	next_client = rooms[room_id].getNextP(socket.id);
  	current_pack_client_id = rooms[room_id].clientToPackClientid[socket.id];
  	rooms[room_id].packs[current_pack_client_id].splice(msg, 1);

  	if (rooms[room_id].packs[current_pack_client_id].length>0){//if the pack is not empty
  		console.log("sending to client: " + String(next_client) + " pack client id: " + String(current_pack_client_id));
	  	nsp.to(next_client).emit('new pack', rooms[room_id].packs[current_pack_client_id]);
	  	rooms[room_id].waiting[next_client] = 0;	
	}
  	console.log("on Card Selected");
  	console.log(JSON.stringify(rooms[room_id].waiting));
  	rooms[room_id].setPackToPrevious(socket.id);//packNumber = utils.previousP(packNumber, nextMap, previousMap, roundOfThree);
  });

  socket.on('waiting', function(msg){
  	var room_id = peopleToRoom[socket.id].room;
  	rooms[room_id].waiting[socket.id] = 1;
  	console.log("on Waiting");
  	console.log(JSON.stringify(rooms[room_id].waiting));
  	if (rooms[room_id].allWaiting() && rooms[room_id].roundOfThree < 2){
  		console.log("new round");
  		rooms[room_id].roundOfThree ++;
  		rooms[room_id].packs = []
  		rooms[room_id].initialize(); //reset waiting and clientToPackClientid
  		for (i=0; i<rooms[room_id].settings.nPlayers; i++){
		  	nsp.to(rooms[room_id].clientids[i]).emit('round over', "");
  		}
  	}
  	else if (rooms[room_id].allWaiting() && rooms[room_id].roundOfThree >=2){
  		rooms[room_id].allDone = true;
  	}
  	else{
  		//do nothing
  	}
  });

  socket.on('round over ack', function(msg){
  	var room_id = peopleToRoom[socket.id].room;
  	var cards = utils.pickChosen(resp, rooms[room_id].settings.nCommons, rooms[room_id].settings.nUncommons, rooms[room_id].settings.nRares, rooms[room_id].settings.nLands);
  	console.log(JSON.stringify(cards));
  	rooms[room_id].packs[socket.id] = cards;
  	socket.emit('first pack', cards);
  });

});

/*

Algorithm:
When all 8 connected clients click start (send a start message to server):
	-server sends round start
	-clients send round start ack
	-create 8 packs, send packs to all 8 clients
	-initialize buffer queues to empty
	-initialize the waiting flag for all 8 clients to 0

When client i clicks on a card
	-emit message to server with the card they clicked
	-client clears all cards from screen
	-adds clicked card to side panel
	if buffer queue is not empty:
		put dequeue(buffer) cards on screen
	else
		put "waiting for pack" on screen
		set (client) waiting for pack flag = 1
		send waiting for pack message to server
			Server sets (server) "waiting" flag for client i to 1
	-server removes clicked card from pack
	-server records card in client i's pool
	-server sends pack to next(client i)

When next(client i) receives a pack from prev(next(client i)):
	if (client) waiting for pack flag == 1
		display pack on screen
		(client) waiting for pack flag = 0
	else 
		enqueue(pack)
		
When all waiting flags are 1, the round is over - server sends round over
clients resets waiting for pack flag to 0, each client sends round over ack,
server sends everyone new packs, reverse direction

One more round, send everyone new packs, reverse direction

allDone

Next Steps:
Add rooms for clients to be able to join
Add settings
Add Bots
Timeout (30 Seconds?)
Deal with Disconnects
Have server keep track of each client's pool
Cookies (auth, restore state if closed window)
Add set selector (that all clients and the server can see)
Make Front End Pretty
Add passwords to rooms
Load from database instead of a different json file for each set
Add download button - cockatrice format
Mana curve indicator
Type count indicator
Color indicator
Sealed/other ormats
Deck builder
Bot AI
User accounts (OAuth)
Email Deck

*/

http.listen(3000, function(){
  console.log('listening on *:3000');
});