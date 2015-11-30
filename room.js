var shuffle = function (array){
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

var getNext = function(i, max){
    if (i > max-1){
        return -1;
    }
    else if (i == max-1){
        return 0;
    }
    else{
        return i+1;
    }
}

var makeRepeatedArray = function(length, value){
    arr = [];
    for (i=0; i<length; i++){
        arr.push(value);
    }
    return arr;
}

function Room(name, id, settings, clientid) {
	this.started = 0; // number of players in room who clicked start
	this.name = name; //name of the room
	this.id = id; //room id
	this.settings = settings; //{nPlayers, nCommons, nUncommons, nRares, nLands}
	this.clientids = []; // keeps track of all clientids in the room
	this.clientids.push(clientid);
	this.inprogress = false; //whether the drafting is in progress
	this.allDone = false; //whether drafting is completely done
	this.roundOfThree = 0; //the round of drafting (first, second, or third)
	//initialize waiting array
	this.waiting = {};
	this.packs = {};//initial packs for that client id for that round (packs[client.id] = initialPack)
	//this.clientidToNumber = []; //map from client id to position in clientids array
	this.clientToPackClientid = {}; //map from the client id to the current pack they are dealing with
	//initialize player maps
	this.nextMap = null;
	this.previousMap = null;
};

Room.prototype.initialize = function(){  //initialize waiting and clientToPackClientid
	for (i=0; i<this.clientids.length; i++){
		this.waiting[this.clientids[i]] = 0;
		//this.clientidToNumber[clientids[i]] = i;
		this.clientToPackClientid[this.clientids[i]] = this.clientids[i];
	}
	this.inprogress = true;
	console.log("waiting: " + JSON.stringify(this.waiting));
	console.log("clientToPackClientid: " + JSON.stringify(this.clientToPackClientid));
};

Room.prototype.initializeRandomMaps = function(){
    arrShuffle = []
    for (i=0; i<this.settings.nPlayers; i++){
        arrShuffle.push(i);
    }
    shuffle(arrShuffle);
    console.log(arrShuffle);
    this.nextMap = new Map();
    this.previousMap = new Map();
    var ret = [];
    for (i=0; i<this.settings.nPlayers; i++){
        this.nextMap.set(this.clientids[arrShuffle[i]], this.clientids[arrShuffle[getNext(i, this.settings.nPlayers)]]); //set the next player of clientids[i] to the clientids[nextNumber]
        this.previousMap.set(this.clientids[arrShuffle[getNext(i, this.settings.nPlayers)]], this.clientids[arrShuffle[i]]);
    }
    //LOG MAPS:
	console.log("next:");
	for (var entry of this.nextMap) {
	  console.log(entry[0] + " = " + entry[1]);
	}
	console.log("previous:");
	for (var entry of this.previousMap) {
	  console.log(entry[0] + " = " + entry[1]);
	}
}

// var nextP = function(i, next, prev, rot){
//     if (rot == 1){
//         return prev.get(i);
//     }
//     else{
//         return next.get(i);
//     }
// }
Room.prototype.getNextP = function(clientid){
	if (this.roundOfThree == 1){
		return this.previousMap.get(clientid);
	}
	else{
		return this.nextMap.get(clientid);
	}
};

Room.prototype.getPreviousP = function(clientid){
	if (this.roundOfThree == 1){
		return this.nextMap.get(clientid);
	}
	else{
		return this.previousMap.get(clientid);
	}
}

Room.prototype.setPackToPrevious = function(clientid){
	var currPack = this.clientToPackClientid[clientid];
	this.clientToPackClientid[clientid] = this.getPreviousP(currPack); 
}

Room.prototype.allWaiting = function(){
	for (i=0; i<this.clientids.length; i++){
		if (this.waiting[this.clientids[i]]==0){
			return false;
		}
	}
	return true;
	// for (var entry in this.waiting) {
	//   console.log("allWaitingEntry: " + String(entry[1]));
	//   if (entry[1]==0){
	//   	return false;
	//   }
	// }
	// return true;
}

module.exports = Room;