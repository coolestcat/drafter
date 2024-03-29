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


var nsp = io.of('/my-namespace');
nsp.on('connection', function(socket){
  console.log('someone connected:');
  console.log(socket.id);
  console.log(JSON.stringify(roomList));
  socket.emit('room list', roomList);
  var room = null; //the room that this socket entered


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
  socket.on('leave room', function(msg){
    console.log('[leave room]');
    for (i=0; i<room.clientids.length; i++){
      if (room.clientids[i]==socket.id){
        room.clientids.splice(i,1);
        break;
      }
    }
    socket.leave(String(room.id));
    room = null;
    socket.emit('leave success', ""); 
  });

  socket.on('chat msg', function(msg){
    console.log('[chat msg]: ' + msg);
    nsp.to(String(room.id)).emit('chat received', msg);
  });

  socket.on('disconnect', function(){
    nsp.to(String(room.id)).emit('some disconnect', socket.id);
  });

  socket.on('req_cid', function(msg){
    console.log('[req_cid]');
    console.log('bot cid:' + String(socket.id));
    room = rooms[msg]; //set room to be the bot's room
    socket.join(String(msg));
    socket.emit('cid', socket.id);
  });

  socket.on('cid_set', function(msg){
    room.bots_connected ++; 
    room.clientids.push(socket.id);
    if (room.bots_connected == room.bots.length){ //when all the bots' clientids are in room.clientids
      room.initialize();
      //initialize client id to next client id maps
      room.initializeRandomMaps();  
      nsp.to(String(room.id)).emit('round start', "");
    }
  });

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
  	rooms[room_id] = new_room;
    room = rooms[room_id];
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
	  	rooms[msg].clientids.push(socket.id);
      room = rooms[msg];
	  	socket.join(String(msg));
	  	socket.emit('join room success', room.settings.waittime); 		
  	}
  });

  socket.on('start', function(msg){ //when room is allDone, remove room from roomList; 
  	//if room is started but not done, show as in progress on roomList
	  console.log('[start]');
    room.started ++;
  	//if (room.started == room.settings.nPlayers){ 
    if (room.started == room.clientids.length){ //allow for bots
      console.log('enough people joined');
      if (room.started == room.settings.nPlayers){
        room.initialize();
        //initialize client id to next client id maps
        room.initializeRandomMaps();  
        nsp.to(String(room.id)).emit('round start', "");
      }
      else{
        room.initializeBots();
        console.log('done initializing bots');        
      }
	  }
  });

  socket.on('round start ack', function(msg){
    console.log('[round start ack]');
  	var cards = utils.pickChosen(resp, room.settings.nCommons, room.settings.nUncommons, room.settings.nRares, room.settings.nLands);
  	room.packs[socket.id] = cards;
  	socket.emit('first pack', cards);
  	socket.emit('identifier', socket.id);
  });

  socket.on('card selected', function(msg){
    console.log('[card selected]');
  	next_client = room.getNextP(socket.id);
  	current_pack_client_id = room.clientToPackClientid[socket.id];
    if (Object.keys(room.packs).length == 0){ // new round has started - ignore this message
      return;
    }
    else{
      room.packs[current_pack_client_id].splice(msg, 1);
    }

  	if (room.packs[current_pack_client_id].length>0){//if the pack is not empty
  		//console.log("sending to client: " + String(next_client) + " pack client id: " + String(current_pack_client_id));
	  	nsp.to(next_client).emit('new pack', room.packs[current_pack_client_id]);
	  	room.waiting[next_client] = 0;	//have to set to zero before checking allWaiting because 
      //otherwise when both players click at the same time, new round is initiated
	  }
    if (room.allWaiting() && room.roundOfThree < 2){
      console.log("new round");
      room.roundOfThree ++;
      room.packs = {};
      room.initialize(); //reset waiting and clientToPackClientid
      nsp.to(String(room.id)).emit('round over', "");
    }
    else if (room.allWaiting() && room.roundOfThree >=2){
      room.allDone = true;
      nsp.to(String(room.id)).emit('all done', "");
    }
    else{
      //console.log("on Card Selected");
      //console.log(JSON.stringify(room.waiting));
      room.setPackToPrevious(socket.id);//packNumber = utils.previousP(packNumber, nextMap, previousMap, roundOfThree);
    }
  });


  socket.on('waiting', function(msg){
    console.log('[waiting]');
  	room.waiting[socket.id] = 1; //set the waiting of socketid to 1
  	//console.log("on Waiting");
  	//console.log(JSON.stringify(room.waiting));
  });

  socket.on('round over ack', function(msg){
    console.log('[round over ack]');
  	var cards = utils.pickChosen(resp, room.settings.nCommons, room.settings.nUncommons, room.settings.nRares, room.settings.nLands);
  	//console.log(JSON.stringify(cards));
  	room.packs[socket.id] = cards;
  	socket.emit('first pack', cards);
  });


  //Download card pool in Cockatrice format
  socket.on('download', function(pool){
    var poolString = "";
    poolString = poolString + "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<cockatrice_deck version=\"1\">\n<deckname></deckname>\n<comments></comments>\n<zone name=\"main\">\n";
    console.log(pool);
    for (i in pool){
      card = pool[i];
      console.log(card["name"]);
      poolString = poolString + "<card number=\"1\" price=\"0\" name=\"" + card["name"];
      poolString = poolString + "\"/>\n";
    }

    poolString = poolString + "</zone></cockatrice_deck>";
    fileString = "./public/tmp/" + String(socket.id) + ".cod";
    sendFileString = "tmp/" + String(socket.id) + ".cod";
    fs.writeFile(fileString, poolString, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    }); 

    socket.emit('download created', sendFileString);
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

*/

http.listen(3000, function(){
  console.log('listening on *:3000');
});
