angular.module('starter.controllers', [])

    .controller('TripCtrl', function ($scope, Localstorage, Planner,$state,$q, $cordovaLocalNotification) {

        $scope.$on('$ionicView.beforeEnter', function(){
            if($scope.trips === undefined || $scope.trips.length != Localstorage.getObject("trips").length) {
                $scope.trips = Localstorage.getObject("trips");
                $scope.doRefresh();
            }
        });

        $scope.addNotification = function() {
            var now = new Date().getTime();
            var alerttime = new Date(now + 10 * 1000);
            $cordovaLocalNotification.schedule({
                id: 1,
                title: 'Title here',
                text: 'Text here',
                at: alerttime
            }).then(function(){
                console.log("Notification Added!");
            });
        }

        $scope.deleteFavourite = function(index) {
            var newtrips = [];
            var tripIndex = 0;
            angular.forEach($scope.trips, function(trip){
                if(tripIndex != index) {
                    newtrips.push(trip);
                }
                tripIndex++;
            });
            Localstorage.setObject("trips",newtrips);
            $scope.trips = Localstorage.getObject("trips");
        }

        $scope.doRefresh = function(){

            var requestList = [];
            angular.forEach($scope.trips, function(trip){
                requestList.push(Planner.searchRountes(trip.ResOrigin.SiteId,trip.ResDestination.SiteId));
            });

            var now = Date.now();
            var index = 0;
            $q.all(requestList).then(function(results){
                angular.forEach(results,function(result){
                    if(!angular.isArray(result[0].LegList.Leg)) {
                        result[0].LegList.Leg = [result[0].LegList.Leg];
                    }
                    $scope.trips[index].nextTrip = result[0];
                    //Calculate left time
                    var datestring = result[0].LegList.Leg[0].Origin.date + "T" + result[0].LegList.Leg[0].Origin.time;// + "+0200"; //Add timezone
                    var starttime = new Date(datestring);
                    $scope.trips[index].Lefttime = Math.round((starttime-now)/60000) - 120;//Bad tempory fix for timezone problem
                    if($scope.trips[index].Lefttime < 0) { $scope.trips[index].Lefttime = 0; }

                    index++;
                });
                $scope.$broadcast('scroll.refreshComplete');
            });
        }

        $scope.selectTrip = function(route){
            Planner.setSelectedTrip(route);
            $state.go('tab.trip-info1');
        }


        $scope.clear = function(){
            Localstorage.setObject('trips',[]);
            $state.go($state.current, {}, {reload: true});
        }
    })

    .controller('PlannerCtrl', function ($scope, Planner, $ionicLoading, $q, Localstorage, $state, Stations, $stateParams) {


        $scope.$on('$ionicView.enter', function(){
            $scope.fromStation = Planner.getFrom();
            $scope.toStation = Planner.getTo();
            $scope.isFavourite = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation);
        });

        $scope.exchangeStations = function () {
            Planner.setFrom($scope.toStation);
            Planner.setTo($scope.fromStation);
            $scope.fromStation = Planner.getFrom();
            $scope.toStation = Planner.getTo();
            $scope.isFavourite = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation);
        }

        $scope.gotoStation = function(param) {
            $state.go('tab.selectstation',{fromorto: param});
        }

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
            if(trip.Lefttime < 0) { trip.Lefttime = 0; }

        }

        $scope.selectTrip = function(route){
            Planner.setSelectedTrip(route);
        }

        $scope.addFavouriteTrip = function() {
            if(!$scope.isFavourite) {
                $ionicLoading.show({
                    template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
                });

                var trips = Localstorage.getObject('trips');
                var trip = {
                    ResOrigin: $scope.fromStation,
                    ResDestination: $scope.toStation,
                    Lefttime: "*"
                }
                trips.push(trip);
                Localstorage.setObject('trips',trips);
                $scope.isFavourite = true;
                $ionicLoading.hide();
            }
        }

    })

    .controller('StationCtrl', function ($scope, $state, $stateParams, Stations, Planner, $ionicLoading) {

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
            $state.go('tab.planner');
        }

    })

    .controller('TripInfoCtrl', function ($scope, Planner, $q, Localstorage, $state, $ionicLoading) {
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        //
        //$scope.$on('$ionicView.enter', function(e) {
        //});

        $scope.$on('$ionicView.beforeEnter', function(){

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

        });



        $scope.tripDetailSwitch = function(legIndex) {
            if($scope.trip.LegList.Leg[legIndex].showTripDetail){
                $scope.trip.LegList.Leg[legIndex].showTripDetail = false;
            } else {
                $scope.trip.LegList.Leg[legIndex].showTripDetail = true;
            }

        }

        $scope.gotrip = function(trip) {
            Localstorage.setObject('ongoing',trip);
            $state.go('tab.currenttrip');
        }

    })

    .controller('CurrentTripCtrl', function($scope, Localstorage){

        $scope.$on('$ionicView.beforeEnter', function(){
            $scope.trip = Localstorage.getObject('ongoing');
            $scope.isongoing = $scope.trip == null ? false:true;
        });


        $scope.finish = function(){
            Localstorage.setObject('ongoing',null);
            $scope.trip = Localstorage.getObject('ongoing');
            $scope.isongoing = false;
        }

    });
