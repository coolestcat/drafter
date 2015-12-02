var draftApp = angular.module('draftApp', []);

draftApp.controller('draftCtrl', function ($scope) {
  $scope.cards = [];
  $scope.pool = [];
  $scope.queue = new Queue();
  $scope.waitingFlag = 0;
  $scope.identifier = -1;
  $scope.display_pic = "http://vignette1.wikia.nocookie.net/magic-thegathering/images/c/c8/Magic_Card_Back.png/revision/latest?cb=20130416121221";
  $scope.roomEntered = false;
  $scope.roomExited = true;
  $scope.waittime = 10;
  $scope.settings = {
  	nPlayers : 8,
  	nCommons : 10,
  	nUncommons : 3,
  	nRares : 1,
  	nLands: 1,
  };
  $scope.newRoomName = "New Room!";
  $scope.rooms = [];
  $scope.timer = null;
  $scope.timerId = null;
  $scope.lock = 0;

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
      //console.log("subtracting");
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
  	$scope.$digest();
  }

  $scope.passIndex = function(index){
    var x = index;
    $scope.removeCards(x);
  }

  $scope.removeCards = function(index){
    // while($scope.lock == 1){
    //   setTimeout(100);//wait for lock to be freed
    // }
    // $scope.lock = 1;
    console.log('remove Cards called');
  	var name = $scope.cards[index].name;
    clearTimeout($scope.timerId);
    $scope.timer = null;
  	//console.log(name);
  	var socket = io('/my-namespace');
  	$scope.pool.push($scope.cards[index]);
  	$scope.cards = [];
    try{
      $scope.$digest();
    }
    catch(err){
    }
    
  	if ($scope.queue.isEmpty()){
  		console.log("card removed, waiting!");
  		$scope.waitingFlag = 1;
  		socket.emit('waiting', 'w');
      socket.emit('card selected', index);
  	}
  	else{
  		new_pack = $scope.queue.dequeue();
      console.log('remove cards setting cards:');
  		$scope.cards = new_pack;
      $scope.setTimer($scope.waittime);
      socket.emit('card selected', index);
  	}
    // $scope.lock = 0;
  }

  $scope.showPage = function(){
  	$scope.roomEntered = true;
  	$scope.roomExited = false;
    var toEmit = [];
    toEmit.push($scope.newRoomName);
    toEmit.push($scope.settings);
  	socket.emit('create room', toEmit);
  }

  $scope.setDisplayPic = function(index){
  	$scope.display_pic = $scope.pool[index].image_url;
  }

  $scope.joinRoom = function(index){
  	socket.emit('join room', $scope.rooms[index].id);
  }

});