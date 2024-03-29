var draftApp = angular.module('draftApp', ['socket.io']);

draftApp.controller('draftCtrl', function ($scope, $socket) {
  $scope.cards = [];
  $scope.pool = [];
  $scope.queue = new Queue();
  $scope.waitingFlag = 0;
  $scope.identifier = -1;
  $scope.display_pic = "http://vignette1.wikia.nocookie.net/magic-thegathering/images/c/c8/Magic_Card_Back.png/revision/latest?cb=20130416121221";
  $scope.roomEntered = false;
  $scope.roomExited = true;
  $scope.disconnectShow = false;
  $scope.downloadShow = false;
  $scope.waittime = 10;
  $scope.chats = ["[messages]:"];
  $scope.chattext = "hello";
  $scope.settings = {
  	nPlayers : 8,
  	nCommons : 10,
  	nUncommons : 3,
  	nRares : 1,
  	nLands: 1,
    waittime: 10,
  };
  $scope.newRoomName = "New Room!";
  $scope.rooms = [];
  $scope.timer = null;
  $scope.timerId = null;
  $scope.lock = 0;
  $scope.whodisconnected = null;

  //scope functions
  $scope.sendMessage = function(){
    $socket.emit('chat msg', $scope.chattext);
    $scope.chattext = "";
  }

  $scope.sendStart = function(){
    $socket.emit('start', "");
    $("#start").remove();
    $("#leave").remove();
    var main = document.getElementById('main');
    var newdiv = document.createElement('div');
    newdiv.setAttribute('class', 'spinner');
    newdiv.setAttribute('id', 'spinner');
    main.appendChild(newdiv);
  }

  $scope.sendLeave = function(){
    $socket.emit('leave room', "");
  }

  $scope.pickRandom = function(){
    r = Math.floor(Math.random()*$scope.cards.length);
    $scope.removeCards(r);
  }

  var countdown = function(){
    if ($scope.timer == 0){
      clearTimeout($scope.timerId);
      console.log("pick Random");
      $scope.pickRandom();
    }
    else{
      $scope.timer--;
      $scope.$apply();
    }
  }

  $scope.setTimer = function(seconds){
    console.log('setTimer called');
    $scope.timer = seconds;
    $scope.timerId = setInterval(countdown, 1000);
  }

  $scope.setCardsInitial = function(pack){
    console.log('setCardsInitial called');
  	$scope.cards = pack;
  }

  $scope.passIndex = function(index){
    var x = index;
    $scope.removeCards(x);
  }

  $scope.removeCards = function(index){
    console.log('remove Cards called');
  	var name = $scope.cards[index].name;
    clearTimeout($scope.timerId);
    $scope.timer = null;
  	//console.log(name);
  	$scope.pool.push($scope.cards[index]);
  	$scope.cards = [];
    try{
      $scope.$digest();//for some reason the last removeCards called never applies...
    }
    catch(err){
    }
    
  	if ($scope.queue.isEmpty()){
  		console.log("card removed, waiting!");
  		$scope.waitingFlag = 1;
  		$socket.emit('waiting', 'w');
      $socket.emit('card selected', index);
  	}
  	else{
  		new_pack = $scope.queue.dequeue();
      console.log('remove cards setting cards:');
  		$scope.cards = new_pack;
      $scope.setTimer($scope.waittime);
      $socket.emit('card selected', index);
  	}
  }

  $scope.showPage = function(){
  	$scope.roomEntered = true;
  	$scope.roomExited = false;
    $scope.waittime = $scope.settings.waittime;
    var toEmit = [];
    toEmit.push($scope.newRoomName);
    toEmit.push($scope.settings);
  	$socket.emit('create room', toEmit);
  }

  $scope.setDisplayPic = function(index){
  	$scope.display_pic = $scope.pool[index].image_url;
    console.log("display pic set");
  }

  $scope.joinRoom = function(index){
  	$socket.emit('join room', $scope.rooms[index].id);
  }

  $scope.downloadCockatrice = function(){
    $socket.emit('download', $scope.pool);
  }

  //socket functions
  $socket.on('download created', function(msg){
    console.log('download created: ' + String(msg));
    window.open(msg);
  });


  $socket.on('chat received', function(msg){
    $scope.chats.push(msg);
  });

  $socket.on('room list', function(msg){
    $scope.rooms = msg;
    console.log(JSON.stringify($scope.rooms));
  });

  $socket.on('first pack', function(msg){
    console.log('first pack setting cards:');
    $scope.setCardsInitial(msg); 
    $scope.setTimer($scope.waittime);
  });

  $socket.on('identifier', function(msg){
    $scope.identifier = msg;
    console.log(msg);    
  });

  $socket.on('new pack', function(msg){
    console.log('new pack called');
    if ($scope.waitingFlag == 1){
      console.log('new pack setting cards:');
      $scope.setCardsInitial(msg); 
      $scope.setTimer($scope.waittime);
      $scope.waitingFlag = 0;
    }
    else{
      console.log('new pack queued');
      $scope.queue.enqueue(msg);
    }
  });

  $socket.on('round over', function(msg){
    $scope.waitingFlag = 0;
    $socket.emit('round over ack', "");
  });

  $socket.on('round start', function(msg){
    $("#spinner").remove();
    $socket.emit('round start ack', "");
  });

  $socket.on('join room failure', function(msg){
    console.log(msg);
  });

  $socket.on('join room success', function(msg){
    $scope.roomEntered = true;
    $scope.roomExited = false;
    $scope.waittime = msg;
  });

  $socket.on('some disconnect', function(msg){
    $scope.whodisconnected = String(msg);
    $scope.disconnectShow = true;
  });

  $socket.on('leave success', function(msg){//need to make sure server reversed join room before allowing user to join another room
    $scope.roomEntered = false;
    $scope.roomExited = true;
  });

  $socket.on('all done', function(msg){
    $scope.downloadShow = true;
  });

});