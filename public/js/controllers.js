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
  $scope.settings = {
  	nPlayers : 8,
  	nCommons : 10,
  	nUncommons : 3,
  	nRares : 1,
  	nLands: 1,
  };
  $scope.newRoomName = "New Room!";
  $scope.rooms = [];

  $scope.setCardsInitial = function(pack){
  	//console.log(pack);
  	$scope.cards = pack;
  	//$scope.cards = ["c","d","e","f"];
  	console.log($scope.cards);
  	$scope.$apply();
  }

  $scope.setCards = function(pack){
  	$scope.cards = pack;
  	console.log($scope.cards);
  }

  $scope.removeCards = function(index){
  	var name = $scope.cards[index].name;
  	console.log(name);
  	var socket = io('/my-namespace');
  	socket.emit('card selected', index);
  	$scope.pool.push($scope.cards[index]);
  	$scope.cards = [];
  	if ($scope.queue.isEmpty()){
  		console.log("waiting!");
  		$scope.waitingFlag = 1;
  		socket.emit('waiting', 'w');
  	}
  	else{
  		new_pack = $scope.queue.dequeue();
  		$scope.cards = new_pack;
  	}
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