angular.module('starter.controllers', [])

    .controller('TripCtrl', function ($scope, Localstorage, Stations,$state) {

        $scope.$on('$ionicView.beforeEnter', function(){
            $scope.trips = Localstorage.getObject("trips");
        });


        $scope.clear = function(){
            Localstorage.setObject('trips',[]);
            $state.go($state.current, {}, {reload: true});
        }

    })

    .controller('TripDetailCtrl', function ($scope, $stateParams, $q, Localstorage, Planner) {

        var trips = Localstorage.getObject("trips");
        $scope.trip = trips[$stateParams.tripIndex];

        var requestList = [];
        angular.forEach($scope.trip.Subtrip, function(subtrip){
            requestList.push(Planner.getAvailableWays(subtrip.Origin.SiteId, subtrip.Destination.SiteId));
        });

        $q.all(requestList).then(function(waysList){
            $scope.waysList = waysList;
        });


    })

    .controller('PlannerCtrl', function ($scope, Planner, $ionicLoading, $q, Localstorage, Stations, $stateParams) {


        $scope.$on('$ionicView.beforeEnter', function(){
            $scope.fromStation = Planner.getFrom();
            $scope.toStation = Planner.getTo();
        });

        $scope.searchRoutes = function(){

            $ionicLoading.show({
                template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
            });

            Planner.searchRountes($scope.fromStation.SiteId, $scope.toStation.SiteId)
                .then(function(result) {
                    angular.forEach(result, function(trip){
                        prepareDataForTripObject(trip);
                    })
                    $scope.routes = result;
                    $ionicLoading.hide();
                });

        }

        /*Add origin, destination, starttime, endtime, lefttime to a trip*/
        var prepareDataForTripObject = function(trip){
            var now = Date.now();
            if(!angular.isArray(trip.LegList.Leg)) {
                trip.LegList.Leg = [trip.LegList.Leg];
            }
            //Trip has transfer
            trip.Origin = trip.LegList.Leg[0].Origin;
            trip.Destination = trip.LegList.Leg[trip.LegList.Leg.length-1].Destination;

            //Calculate left time
            var datestring = trip.Origin.date + "T" + trip.Origin.time;// + "+0200"; //Add timezone
            var starttime = new Date(datestring);
            trip.Lefttime = Math.round((starttime-now)/60000) - 120;//Bad tempory fix for timezone problem

        }

        $scope.selectTrip = function(route){
            Planner.setSelectedTrip(route);
        }


        $scope.addTrip = function(route) {

            $ionicLoading.show({
                template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
            });

            if(angular.isArray(route.LegList.Leg)) {

                var requestList = [];

                angular.forEach(route.LegList.Leg, function(leg){
                    if(leg.type !== "WALK") {
                        requestList.push(Planner.getTripOnlyWithStation(leg));
                    }
                });

                $q.all(requestList).then(function(results){
                    var trip = {
                        ResOrigin: results[0].Origin,
                        ResDestination: results[results.length-1].Destination,
                        Subtrip:[]
                    };
                    angular.forEach(results, function(result){
                        trip.Subtrip.push(result);
                    })
                    var trips = Localstorage.getObject('trips');
                    trips.push(trip);
                    Localstorage.setObject('trips',trips);
                    $ionicLoading.hide();
                });


            } else {

                Planner.getTripOnlyWithStation(route.LegList.Leg).then(function(result){
                    var trips = Localstorage.getObject('trips');
                    var trip = {
                        ResOrigin: result.Origin,
                        ResDestination: result.Destination,
                        Subtrip: [result]
                    }
                    trips.push(trip);
                    Localstorage.setObject('trips',trips);
                    $ionicLoading.hide();
                });

            }



        }
    })

    .controller('StationCtrl', function ($scope, $stateParams, Stations, Planner, $ionicLoading) {

        $scope.fromorto = $stateParams.fromorto;

        $scope.search = function (station) {

            $ionicLoading.show({
                template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
            });


            Stations.findStations(station.name)
                .then(function(result) {
                    $scope.searchResults = result;
                    $ionicLoading.hide();
                });

        }

        $scope.setStation = function (station) {
            if($scope.fromorto == "From") {
                Planner.setFrom(station);
            } else if ($scope.fromorto == "To") {
                Planner.setTo(station);
            } else {
                console.log("Error! It is neither from or to!");
            }
        }

    })

    .controller('TripInfoCtrl', function ($scope, Planner, $q) {
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        //
        //$scope.$on('$ionicView.enter', function(e) {
        //});

        $scope.trip = Planner.getSelectedTrip();
        if(!angular.isArray($scope.trip.LegList.Leg)) {
            $scope.trip.LegList.Leg = [$scope.trip.LegList.Leg];
        }

        var requestList = [];
        if(angular.isArray($scope.trip.LegList.Leg)) {
            angular.forEach($scope.trip.LegList.Leg, function(leg){
                if(leg.JourneyDetailRef !== undefined) {
                    requestList.push(Planner.getTripDetails(leg.JourneyDetailRef.ref));
                }
            });

            $q.all(requestList).then(function(results){
                var i = 0;
                angular.forEach($scope.trip.LegList.Leg, function(leg){
                    if(leg.JourneyDetailRef !== undefined) {
                        leg.Stops = results[i];
                        leg.showTripDetail = false;
                        i++;
                    }
                });
            });
        }

        $scope.tripDetailSwitch = function(legIndex) {
            if($scope.trip.LegList.Leg[legIndex].showTripDetail){
                $scope.trip.LegList.Leg[legIndex].showTripDetail = false;
            } else {
                $scope.trip.LegList.Leg[legIndex].showTripDetail = true;
            }

        }



    })


    .controller('ChatsCtrl', function ($scope, Chats) {
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        //
        //$scope.$on('$ionicView.enter', function(e) {
        //});

        $scope.chats = Chats.all();
        $scope.remove = function (chat) {
            Chats.remove(chat);
        }
    })

    .controller('ChatDetailCtrl', function ($scope, $stateParams, Chats) {
        $scope.chat = Chats.get($stateParams.chatId);
    })

    .controller('AccountCtrl', function ($scope) {
        $scope.settings = {
            enableFriends: true
        };
    });
