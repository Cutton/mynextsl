angular.module('starter.controllers', [])


    /*
    * My trips controller
    * */
    .controller('TripCtrl', function ($scope, Localstorage, Planner,$state,$q, $cordovaLocalNotification) {

        $scope.$on('$ionicView.beforeEnter', function(){
            if($scope.trips === undefined || $scope.trips.length != Localstorage.getObject("trips").length) {
                $scope.trips = Localstorage.getObject("trips");
                $scope.doRefresh();
            }

            $scope.autoRefresh = setInterval($scope.doRefresh, 30000);

        });

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
            $q.all(requestList).then(function(results){
                angular.forEach(results,function(routes,key){
                    $scope.trips[key].routes = [];
                    angular.forEach(routes,function(route){
                        if(!angular.isArray(route.LegList.Leg)) {
                            route.LegList.Leg = [route.LegList.Leg];
                        }
                        //Calculate left time
                        var datestring = route.LegList.Leg[0].Origin.date + "T" + route.LegList.Leg[0].Origin.time;// + "+0200"; //Add timezone
                        var starttime = new Date(datestring);
                        route.Lefttime = Math.round((starttime-now)/60000) - 120;//Bad tempory fix for timezone problem
                        if(route.Lefttime < 0) { route.Lefttime = 0; }
                        $scope.trips[key].routes.push(route);
                    });
                });
                $scope.$broadcast('scroll.refreshComplete');
            });
        }

        $scope.selectTrip = function(route){
            Planner.setSelectedTrip(route);
            $state.go('tab.trip-info1');
        }


        $scope.toggleRoutes = function(trip) {
            trip.show = !trip.show;
        }

        $scope.isRoutesShown = function(trip) {
            return trip.show;
        }

        $scope.$on('$ionicView.beforeLeave', function(){
            clearInterval($scope.autoRefresh);
        });
    })


    /*
     * Trip planner controller
     * */
    .controller('PlannerCtrl', function ($scope, Planner, $ionicLoading, $q, Localstorage, $state, Stations, $stateParams) {


        $scope.$on('$ionicView.enter', function(){
            $scope.fromStation = Planner.getFrom();
            $scope.toStation = Planner.getTo();
            $scope.isFavourite = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation) != -1? true:false;
        });

        $scope.exchangeStations = function () {
            Planner.setFrom($scope.toStation);
            Planner.setTo($scope.fromStation);
            $scope.fromStation = Planner.getFrom();
            $scope.toStation = Planner.getTo();
            $scope.isFavourite = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation) != -1? true:false;
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
            //Bad tempory fix for timezone problem, because iOS doesn't support "+0200"
            trip.Lefttime = Math.round((starttime-now)/60000) - 120;
            if(trip.Lefttime < 0) { trip.Lefttime = 0; }

        }

        $scope.selectTrip = function(route){
            Planner.setSelectedTrip(route);
        }

        $scope.addFavouriteTrip = function() {
            $ionicLoading.show({
                template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
            });
            if(!$scope.isFavourite) {
                var trips = Localstorage.getObject('trips');
                var trip = {
                    ResOrigin: $scope.fromStation,
                    ResDestination: $scope.toStation,
                    Lefttime: "*"
                }
                trips.push(trip);
                Localstorage.setObject('trips',trips);
                $scope.isFavourite = true;

            } else {
                var newtrips = [];
                var tripIndex = 0;
                var deleteIndex = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation);
                angular.forEach(Localstorage.getObject("trips"), function(trip){
                    if(tripIndex != deleteIndex) {
                        newtrips.push(trip);
                    }
                    tripIndex++;
                });
                Localstorage.setObject("trips",newtrips);
                $scope.isFavourite = false;
            }
            $ionicLoading.hide();
        }

    })


    /*
     * Select station controller
     * */
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



    /*
     * Detailed trip info controller
     * */
    .controller('TripInfoCtrl', function ($scope, Planner, $q, Localstorage, $state, $cordovaLocalNotification, $ionicLoading) {
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        //
        //$scope.$on('$ionicView.enter', function(e) {
        //});

        $scope.$on('$ionicView.beforeEnter', function(){

            $ionicLoading.show({
                template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
            });

            $scope.trip = Planner.getSelectedTrip();
            if(!angular.isArray($scope.trip.LegList.Leg)) {
                $scope.trip.LegList.Leg = [$scope.trip.LegList.Leg];
            }

            var requestList = [];
            if($scope.trip.LegList.Leg.Stops == undefined) {
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
                    $ionicLoading.hide();
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

        var setNotifications = function(trip){
            var index = 0;
            var notificationList = [];
            angular.forEach(trip.LegList.Leg, function(leg){
                if(leg.type != "WALK"){

                    var triptime = new Date(leg.Origin.date+"T"+leg.Origin.time);
                    triptime = triptime - 120*60000;
                    var alerttime = new Date(triptime - 2*60000);
                    var notification = {
                        id: leg.Origin.id+index.toString(),
                        text: leg.name+' towards '+leg.dir+' is coming soon. Please prepare to get on.',
                        at: alerttime
                    }
                    notificationList.push(notification);

                    triptime = new Date(leg.Destination.date+"T"+leg.Destination.time);
                    triptime = triptime - 120*60000;
                    alerttime = new Date(triptime - 1*60000);
                    notification = {
                        id: leg.Destination.id+index.toString(),
                        text: 'You are about to arrive '+leg.Destination.name+'. Please prepare to get off.',
                        at: alerttime
                    }
                    notificationList.push(notification);
                }
                index++;
            });
            $cordovaLocalNotification.schedule(notificationList).then(function(){
                console.log("Notfications are added!");
            });
        }

        $scope.gotrip = function(trip) {
            Localstorage.setObject('ongoing',trip);
            setNotifications(trip);
            $state.go('tab.currenttrip');
        }

    })


    /*
     * Ongoing trip controller
     * */
    .controller('CurrentTripCtrl', function($scope, Localstorage, $ionicPopup, $cordovaLocalNotification, $state){

        $scope.$on('$ionicView.beforeEnter', function(){
            var prepareData = function(trip){
                var tripList = [];
                angular.forEach(trip.LegList.Leg, function(leg){
                    if(leg.type != "WALK") {
                        var tripUnit = {
                            type: "Origin",
                            name: leg.Origin.name,
                            time: leg.Origin.time,
                            date: leg.Origin.date,
                            dir: leg.dir,
                            traffictype: leg.type,
                            line: leg.line
                        }
                        tripList.push(tripUnit);
                        angular.forEach(leg.Stops, function(stop){
                            if(parseInt(stop.routeIdx) < parseInt(leg.Destination.routeIdx)
                                && parseInt(stop.routeIdx) > parseInt(leg.Origin.routeIdx) ){
                                var tripUnit = {
                                    type: "Stop",
                                    name: stop.name,
                                    time: stop.depTime,
                                    date: stop.depDate
                                }
                                tripList.push(tripUnit);
                            }
                        });
                        tripUnit = {
                            type: "Destination",
                            name: leg.Destination.name,
                            time: leg.Destination.time,
                            date: leg.Destination.date
                        }
                        tripList.push(tripUnit);
                    } else {
                        var tripUnit = {
                            type: "Walk",
                            dist: leg.dist,
                            time: leg.Destination.time,
                            date: leg.Destination.date
                        }
                        tripList.push(tripUnit);
                    }
                });
                updateStatus(tripList);
                return tripList;
            }

            var updateStatus = function(tripList){
                var now=Date.now();
                angular.forEach(tripList, function(trip){
                    var triptime = new Date(trip.date+"T"+trip.time);
                    if(now > triptime-120*60000){
                        trip.status = "finished";
                    } else {
                        if($scope.onGoingTrip){
                            trip.status = "todo";
                        } else {
                            trip.status = "ongoing";
                            $scope.onGoingTrip = true;
                        }
                    }
                });
            }

            $scope.trip = Localstorage.getObject('ongoing');
            if($scope.trip == null) {
                $scope.isongoing = false;
            } else {
                $scope.isongoing = true;
                $scope.onGoingTrip = false;
                $scope.tripList = prepareData($scope.trip);
            }

            $scope.time = new Date();

            var autoRefresh = function() {
                if(Date.now() - $scope.time > 30000) {
                    console.log("Refreshed!");
                    $state.go($state.current, {}, {reload: true});
                } else {
                    $scope.timeout = setTimeout(autoRefresh, 30000);
                }
            }
            if($scope.isongoing) {
                autoRefresh();
            }
        });

        $scope.finish = function(){

            var confirmPopup = $ionicPopup.confirm({
                title: 'Do you want to finish this trip?'
            });
            confirmPopup.then(function(res) {
                if(res) {
                    Localstorage.setObject('ongoing',null);
                    $scope.trip = Localstorage.getObject('ongoing');
                    $scope.isongoing = false;
                    $cordovaLocalNotification.cancelAll().then(function(){
                        console.log("All notifications are cancelled.");
                    });
                } else {
                    //nothing to do
                }
            });
        }

        $scope.$on('$ionicView.beforeLeave',function(){
            clearTimeout($scope.timeout);
        });

    });
