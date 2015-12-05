var Queue = require('./queue');

var pickCard = function(cards, pool){
	r = Math.floor(Math.random()*cards.length);
    return r;
}

function Bot(id, roomid, waittime) {
	var botid = id;
	var pool = [];
	var waittime = waittime;
	var roomid = roomid;
	var client = require('socket.io-client'); //different bots are different clients
	var socket = client.connect("http://localhost:3000/my-namespace", {forceNew: true});
	console.log("bot created");
	socket.emit("req_cid", roomid);
	var clientid = null;

	//socket functions - subset of the functions in clients
	socket.on("cid", function(msg){
		console.log("[bot] received cid: " + String(msg));
		clientid = msg;
		socket.emit('cid_set', "");
	});

	socket.on('round start', function(msg){
		socket.emit('round start ack', "");
	});

	socket.on('first pack', function(msg){
		console.log('[bot] first pack setting cards:' + JSON.stringify(msg));
		var index = pickCard(msg, pool);
		pool.push(msg[r]);
		socket.emit('card selected', index);
		socket.emit('waiting', ""); //a bot is always waiting
	});

	socket.on('new pack', function(msg){
		console.log('[bot] new pack setting cards:' + JSON.stringify(msg));
		var index = pickCard(msg, pool);
		pool.push(msg[r]);
		socket.emit('card selected', index);
		socket.emit('waiting', ""); //a bot is always waiting
	});

	socket.on('round over', function(msg){
		console.log(JSON.stringify(pool));
		socket.emit('round over ack', "");
	});
};

module.exports = Bot;
