var socket = io('/my-namespace');

var sendStart = function(){
  socket.emit('start', "");
  $("#start").remove();
  var main = document.getElementById('main');
  var newdiv = document.createElement('div');
  newdiv.setAttribute('class', 'spinner');
  newdiv.setAttribute('id', 'spinner');
  main.appendChild(newdiv);
}

socket.on('first pack', function(msg){
  var appElement = document.querySelector('[ng-app=draftApp]');
  var $scope = angular.element(appElement).scope();
  $scope.setCardsInitial(msg); 
});

socket.on('identifier', function(msg){
  var appElement = document.querySelector('[ng-app=draftApp]');
  var $scope = angular.element(appElement).scope();
  $scope.identifier = msg;
  console.log(msg);
  $scope.$apply();        
});

socket.on('new pack', function(msg){
  var appElement = document.querySelector('[ng-app=draftApp]');
  var $scope = angular.element(appElement).scope();
  if ($scope.waitingFlag == 1){
    $scope.setCardsInitial(msg); 
    $scope.waitingFlag = 0;
  }
  else{
    $scope.queue.enqueue(msg);
  }
});

socket.on('round over', function(msg){
  var appElement = document.querySelector('[ng-app=draftApp]');
  var $scope = angular.element(appElement).scope();
  $scope.waitingFlag = 0;
  socket.emit('round over ack', "");
});

socket.on('round start', function(msg){
  $("#spinner").remove();
  socket.emit('round start ack', "");
});

socket.on('room list', function(msg){
  var appElement = document.querySelector('[ng-app=draftApp]');
  var $scope = angular.element(appElement).scope();
  $scope.rooms = msg;
  $scope.$apply();
  console.log(JSON.stringify($scope.rooms));
});

socket.on('join room failure', function(msg){
  console.log(msg);
});

socket.on('join room success', function(msg){
  var appElement = document.querySelector('[ng-app=draftApp]');
  var $scope = angular.element(appElement).scope();
  $scope.roomEntered = true;
  $scope.roomExited = false;
  $scope.$apply();
});