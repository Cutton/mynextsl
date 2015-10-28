angular.module('starter.controllers', [])
    /*
    * My trips controller
    * */
    .controller('TripCtrl', function ($scope, Localstorage, Planner,$state,$q, $rootScope, Utility, $ionicPopup) {
        $scope.$on('$ionicView.beforeEnter', function(){
            if(Localstorage.getObject('trips')==null){
                Localstorage.setObject('trips',[]);
            }
            $scope.isongoing = Localstorage.getObject('ongoing')==null?false:true;
            $rootScope.$broadcast('inState',{state:'mytrips'});
            if($scope.trips === undefined || $scope.trips.length != Localstorage.getObject("trips").length) {
                $scope.trips = Localstorage.getObject("trips");
                $scope.doRefresh();
            }
            if($scope.autoRefresh == undefined) {
                $scope.autoRefresh = setInterval($scope.doRefresh, 60000);
            }
        });
        $scope.listCanSwipe = true;
        $scope.shouldShowReorder = false;


        //Failed to load data alert window
        $rootScope.httpErrorAlertWindow = function() {
            var alertPopup = $ionicPopup.alert({
                title: 'Sorry, fail to load data from SL server. Try it later.'
            });
            alertPopup.then(function(res) {
                //
            });
        };

        $scope.toggleReorder = function() {
            $scope.shouldShowReorder = !$scope.shouldShowReorder;
        };

        $scope.reorderTrip = function(trip, fromIndex, toIndex) {
            $scope.trips.splice(fromIndex, 1);
            $scope.trips.splice(toIndex, 0, trip);
        };

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
        };

        $scope.doRefresh = function(){
            var requestList = [];
            angular.forEach($scope.trips, function(trip){
                requestList.push(Planner.searchRountes(trip.ResOrigin.SiteId,trip.ResDestination.SiteId));
            });
            $q.all(requestList).then(function(results){
                if(results[0] == "error"){
                    $rootScope.httpErrorAlertWindow();
                } else {
                    angular.forEach(results,function(routes,key){
                        $scope.trips[key].routes = [];
                        angular.forEach(routes,function(route){
                            if(!angular.isArray(route.LegList.Leg)) {
                                route.LegList.Leg = [route.LegList.Leg];
                            }
                            route.Origin = route.LegList.Leg[0].Origin;
                            route.Destination = route.LegList.Leg[route.LegList.Leg.length-1].Destination;
                            //Calculate left time
                            var datestring = route.LegList.Leg[0].Origin.date + "T" + route.LegList.Leg[0].Origin.time;
                            route.Lefttime = Utility.getLeftTimeAsMintues(datestring);
                            $scope.trips[key].routes.push(route);
                        });
                    });
                }
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        $scope.selectTrip = function(route){
            Planner.setSelectedTrip(route);
            $state.go('tab.trip-info1',{tripIndex: 0});
        };


        $scope.toggleRoutes = function(trip) {
            trip.show = !trip.show;
        };

        $scope.isRoutesShown = function(trip) {
            return trip.show;
        };

        $scope.$on('$ionicView.beforeLeave', function(){
            clearInterval($scope.autoRefresh);
        });
    })

    /*
     * Trip planner controller
     * */
    .controller('PlannerCtrl', function ($scope, Planner, $ionicLoading, $q, Localstorage,
                                         $state, $rootScope, Utility, $cordovaDatePicker, $ionicPopover) {
        $scope.$on('$ionicView.enter', function(){
            $rootScope.$broadcast('inState',{state:'tripplanner'});
            $scope.fromStation = Planner.getFrom();
            $scope.toStation = Planner.getTo();
            $scope.isFavourite = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation) != -1? true:false;

            $scope.searchTime = $scope.searchTime==undefined?new Date():$scope.searchTime;
            $scope.searchMode = $scope.searchMode==undefined?"Leave now":$scope.searchMode;
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
            if($scope.searchMode != 'Arrive at'){
                var searchtime;
                if($scope.searchMode == 'Leave now') {
                    searchtime = new Date();
                } else if($scope.searchMode == 'Leave at') {
                    searchtime = $scope.searchTime;
                } else {
                    //never come here
                }
                Planner.searchRountes($scope.fromStation.SiteId, $scope.toStation.SiteId, searchtime)
                    .then(function(result) {
                        if(result == "error") {
                            $rootScope.httpErrorAlertWindow();
                        } else {
                            angular.forEach(result, function(trip){
                                prepareDataForTripObject(trip);
                            })
                            $scope.routes = result;
                        }
                        $ionicLoading.hide();
                    });
            } else {
                Planner.searchRountes($scope.fromStation.SiteId, $scope.toStation.SiteId,
                    $scope.searchTime, $scope.searchMode).then(function(result) {
                        if(result == "error") {
                            $rootScope.httpErrorAlertWindow();
                        } else {
                            angular.forEach(result, function(trip){
                                prepareDataForTripObject(trip);
                            })
                            $scope.routes = result;
                        }
                        $ionicLoading.hide();
                    });
            }
        }

        /*Add origin, destination, lefttime to a trip*/
        var prepareDataForTripObject = function(trip){
            var now = Date.now();
            if(!angular.isArray(trip.LegList.Leg)) {
                trip.LegList.Leg = [trip.LegList.Leg];
            }
            trip.Origin = trip.LegList.Leg[0].Origin;
            trip.Destination = trip.LegList.Leg[trip.LegList.Leg.length-1].Destination;
            //Calculate left time
            var datestring = trip.Origin.date + "T" + trip.Origin.time;
            trip.Lefttime = Utility.getLeftTimeAsMintues(datestring);
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
                var deleteIndex = Planner.isFavouriteTrip($scope.fromStation, $scope.toStation);
                angular.forEach(Localstorage.getObject("trips"), function(trip, key){
                    if(key != deleteIndex) {
                        newtrips.push(trip);
                    }
                });
                Localstorage.setObject("trips",newtrips);
                $scope.isFavourite = false;
            }
            $ionicLoading.hide();
        }

        var setSearchTime = function(){
            var time = new Date();
            if($scope.searchTime != null) {
                time = $scope.searchTime;
            }
            var options = {
                date: time,
                mode: 'datetime',
                allowOldDates: true,
                allowFutureDates: true,
                doneButtonLabel: 'DONE',
                doneButtonColor: '#387ef5',
                cancelButtonLabel: 'CANCEL',
                cancelButtonColor: '#000000'
            };
            $cordovaDatePicker.show(options).then(function(date){
                $scope.searchTime = date;
            });
        }

        $ionicPopover.fromTemplateUrl('templates/timeModeModal.html', {
            scope: $scope
        }).then(function(popover) {
            $scope.timeMode = popover;
        });

        $scope.setSearchMode = function(mode) {
            $scope.searchMode = mode;
            $scope.timeMode.hide();
            if(mode != "Leave now") {
                setSearchTime();
            } else {
                $scope.searchTime = null;
            }

        }

    })

    /*
     * Select station controller
     * */
    .controller('StationCtrl', function ($scope, $state, $stateParams, Stations, Planner, $ionicLoading, $timeout,
                                         $rootScope, Localstorage) {
        $scope.$on('$ionicView.beforeEnter', function(){
            $rootScope.$broadcast('inState',{state:'selectstation'});
            if(Localstorage.getObject("stationHistory") == null){
                Localstorage.setObject('stationHistory',[]);
            }
        });

        $scope.fromorto = $stateParams.fromorto;
        $scope.searchHistory = Localstorage.getObject("stationHistory");
        $scope.search = function (name) {
            if(name.length > 2) {
                Stations.findStations(name)
                    .then(function (result) {
                        if(result == "error"){
                            $rootScope.httpErrorAlertWindow();
                        } else {
                            $scope.searchResults = result;
                        }

                    });
            }
        }

        var addStationToSearchHistory = function(station){
            var stationHistory = Localstorage.getObject("stationHistory");

            var indexForStationInHistory = -1;
            angular.forEach(stationHistory, function(s,key){
                if(s.SiteId == station.SiteId){
                    indexForStationInHistory = key;
                }
            })

            if(indexForStationInHistory != -1) {
                //Same record in history
                if(indexForStationInHistory != 0) {
                    stationHistory.splice(indexForStationInHistory,1);
                }
            }
            //Put searcher record at first
            stationHistory.splice(0,0,station);

            //keep last 5 search records
            var historySize = 5;
            if(stationHistory.length > historySize) {
                //trim to 5 recrds
                stationHistory.splice(5,1);
            }

            Localstorage.setObject('stationHistory',stationHistory);
        }

        $scope.setStation = function (station) {
            addStationToSearchHistory(station);
            if($scope.fromorto == "From") {
                Planner.setFrom(station);
            } else if ($scope.fromorto == "To") {
                Planner.setTo(station);
            } else {
                //Never come here
            }
            $state.go('tab.planner');
        }

        $scope.$on('$ionicView.beforeLeave',function(){
            $rootScope.$broadcast('inState',{state:'leaveSelectstation'});
        });
    })



    /*
     * Detailed trip info controller
     * */
    .controller('TripInfoCtrl', function ($rootScope, $scope, $ionicHistory, Planner, $q, TripNotification,
                                          Localstorage, $state, $cordovaLocalNotification, $ionicPopup,
                                          $ionicLoading, $ionicPopover, Utility) {
        $scope.$on('$ionicView.beforeEnter', function(){
            $scope.trip = Planner.getSelectedTrip();
            $scope.isongoing = Localstorage.getObject('ongoing')==null?false:true;
            $scope.notifiedTime = TripNotification.isInQueue($scope.trip);
            var requestList = [];
            if($scope.trip.LegList.Leg[0].Stops == undefined
                && $scope.trip.LegList.Leg[0].JourneyDetailRef !== undefined) {
                $ionicLoading.show({
                    template: '<ion-spinner icon="lines" class="spinner-light"></ion-spinner>'
                });
                angular.forEach($scope.trip.LegList.Leg, function(leg){
                    if(leg.JourneyDetailRef !== undefined) {
                        requestList.push(Planner.getTripDetails(leg.JourneyDetailRef.ref));
                    }
                });
                $q.all(requestList).then(function(results){
                    if(results[0] == "error") {
                        $rootScope.httpErrorAlertWindow();
                    } else {
                        var i = 0;
                        angular.forEach($scope.trip.LegList.Leg, function(leg){
                            if(leg.JourneyDetailRef !== undefined) {
                                leg.Stops = results[i];
                                leg.showTripDetail = false;
                                i++;
                            }
                        });
                    }
                    $ionicLoading.hide();
                });
            }
        });

        $scope.tripDetailSwitch = function(legIndex) {
            $scope.trip.LegList.Leg[legIndex].showTripDetail = !$scope.trip.LegList.Leg[legIndex].showTripDetail;
        }

        var setNotifications = function(trip){
            var notificationList = [];
            angular.forEach(trip.LegList.Leg, function(leg,key){
                if(leg.type != "WALK"){
                    //Add notfication for origin
                    var triptime = new Date(leg.Origin.date+"T"+leg.Origin.time);
                    triptime = new Date(triptime.getTime()-60*60000);
                    var alerttime = new Date(triptime - 2*60000);
                    var notification = {
                        id: leg.Origin.id+key.toString()+"01",
                        text: leg.name+' towards '+leg.dir+' is coming soon. Please prepare to get on.',
                        at: alerttime
                    }
                    notificationList.push(notification);
                    //Add notification for destination
                    triptime = new Date(leg.Destination.date+"T"+leg.Destination.time);
                    triptime = new Date(triptime.getTime()-60*60000);
                    alerttime = new Date(triptime - 1*60000);
                    notification = {
                        id: leg.Destination.id+key.toString()+"01",
                        text: 'You are about to arrive '+leg.Destination.name+'. Please prepare to get off.',
                        at: alerttime
                    }
                    notificationList.push(notification);
                }
            });
            if(Localstorage.getObject("notification")) {
                $cordovaLocalNotification.schedule(notificationList).then(function(){
                    console.log("Notfications are added!");
                });
            } else {
                console.log("Notfications are added!");
            }

        }

        $ionicPopover.fromTemplateUrl('templates/notificationPop.html', {
            scope: $scope
        }).then(function(popover) {
            $scope.notificationPop = popover;
        });

        $scope.gotrip = function(trip) {
            if($scope.isongoing){
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Do you want to finish current trip and start a new one?'
                });
                confirmPopup.then(function(res) {
                    if(res) {
                        Localstorage.setObject('ongoing',trip);
                        $rootScope.$broadcast('addOnGoingTrip',{message:'message'});
                        setNotifications(trip);
                        $ionicHistory.goBack();
                    } else {
                        //nothing to do
                    }
                });
            } else {
                Localstorage.setObject('ongoing',trip);
                $rootScope.$broadcast('addOnGoingTrip',{message:'message'});
                setNotifications(trip);
                $ionicHistory.goBack();
            }
        }

        $scope.addNotifiedTrip = function(trip,notifyTime) {
            trip.notifyTime = notifyTime;
            TripNotification.addTrip(trip);
            $scope.notificationPop.hide();
            $state.go($state.current, {}, {reload: true});
        }

        $scope.showAlert = function(time){
            $ionicPopup.alert({
                title: 'Sorry, there are not '+time+' minutes left until the trip starts.'
            });
        }

        $scope.setNoficiation = function($event) {
            $scope.goAndNotify = false;
            $scope.selectedTripLeftTime = Utility.getLeftTimeAsMintues($scope.trip.LegList.Leg[0].Origin.date+
                "T"+$scope.trip.LegList.Leg[0].Origin.time);
            $scope.notificationPop.show($event);
        }

        $scope.deleteNotificationFromTripInfo = function(trip){
            console.log("Hi!");
            var confirmPopup = $ionicPopup.confirm({
                title: 'Do you want to cancel this nofication?'
            });
            confirmPopup.then(function(res) {
                if(res) {
                    var index = TripNotification.getTripIndex(trip);
                    if(index != -1){
                        TripNotification.deleteTrip(index);
                        $state.go($state.current, {}, {reload: true});
                    }
                } else {
                    //nothing to do
                }
            });
        }
    })

    /*
     * footer controller
     * */
    .controller('FooterCtrl', function ($rootScope, $scope, Localstorage, $state, Utility,
                                        $ionicPopup, $cordovaLocalNotification, $ionicHistory) {
        $scope.$on('$ionicView.beforeEnter', function(){
            $scope.trip = Localstorage.getObject('ongoing');
            if($scope.trip == null) {
                $scope.isongoing = false;
            } else {
                $scope.isongoing = true;
                $scope.progress = calculateProgress($scope.trip);
                var startTime = $scope.trip.Origin.date+"T"+$scope.trip.Origin.time;
                $scope.Lefttime = Utility.getLeftTimeAsMintues(startTime);
                if($scope.refreshProgress == undefined){
                    $scope.refreshProgress = setInterval($scope.updateProgress, 10000);
                }
            }
        });

        $rootScope.$on('addOnGoingTrip', function (event, args) {
            $scope.isongoing = true;
        });
        $rootScope.$on('inState', function (event, args) {
            if(args.state == "mytrips" || args.state == "tripplanner" || args.state == "tripnotification") {
                $scope.inState = args.state;
            } else if(args.state == "selectstation"){
                clearInterval($scope.refreshProgress);
            } else if(args.state == "leaveSelectstation") {
                $scope.refreshProgress = setInterval($scope.updateProgress, 10000);
            } else if(args.state == "onGoingTrip"){
                $scope.inOnGoingPage = true;
            } else if(args.state == "leaveOnGoingTrip"){
                $scope.inOnGoingPage = false;
            } else {
                //Never come here
            }
        });
        $rootScope.$on('tripProgress', function (event, args) {
            $scope.progress = args.progress;
            $state.go($state.current, {}, {reload: true}); //Force to refresh UI, since footer controller is not active
        });

        $scope.gotoCurrentTrip = function() {
            if($scope.inState == "mytrips"){
                $state.go('tab.mytrips-currenttrip');
            } else if($scope.inState == "tripplanner") {
                $state.go('tab.planner-currenttrip');
            } else if($scope.inState == "tripnotification"){
                $state.go('tab.notification-currenttrip');
            } else {
                //
            }
        }

        var calculateProgress = function(trip) {
            var progress = 0;
            var start = new Date(trip.LegList.Leg[0].Origin.date+"T"+trip.LegList.Leg[0].Origin.time);
            start = new Date(start.getTime()-60*60000);
            var end = new Date(trip.LegList.Leg[trip.LegList.Leg.length-1].Destination.date
                +"T"+trip.LegList.Leg[trip.LegList.Leg.length-1].Destination.time);
            end = new Date(end.getTime()-60*60000);
            var now = new Date();
            if(now.getTime() < start.getTime()){
                progress = 0;
            } else if(now.getTime() > end.getTime()) {
                progress = 100;
            } else {
                progress = (now.getTime()-start.getTime())/(end.getTime()-start.getTime());
                progress = Math.round(progress*100);
            }
            return progress;
        };

        $scope.updateProgress = function(){
            $rootScope.$broadcast("tripProgress",{progress: calculateProgress($scope.trip)});
        };

        var stopTrip = function(){
            clearInterval($scope.refreshProgress);
            var idList = [];
            angular.forEach($scope.trip.LegList.Leg,function(leg,key){
                if(leg.type != "WALK"){
                    var id = leg.Origin.id+key.toString()+"01";
                    idList.push(parseInt(id));
                    id = leg.Destination.id+key.toString()+"01";
                    idList.push(parseInt(id));
                }
            });
            if(Localstorage.getObject("notification")){
                $cordovaLocalNotification.cancel(idList);
            } else {
                console.log("Notfications are cancelled");
            }

            Localstorage.setObject('ongoing',null);
            $scope.trip = Localstorage.getObject('ongoing');
            $scope.isongoing = false;
            if($scope.inOnGoingPage == true){
                $ionicHistory.goBack();
            } else {
                $state.go($state.current, {}, {reload: true});
            }
        };

        $scope.finishTrip = function(){
            var confirmPopup = $ionicPopup.confirm({
                title: 'Do you want to finish this trip?'
            });
            confirmPopup.then(function(res) {
                if(res) {
                    stopTrip();
                } else {
                    //nothing to do
                }
            });
        }
    })

    /*
     *  Trip notification controller
     * */

    .controller('NotifiedTripCtrl', function($scope, $rootScope, TripNotification, $state){
        $scope.$on('$ionicView.beforeEnter', function(){
            $rootScope.$broadcast('inState',{state:'tripnotification'});
            var trips = TripNotification.getTrips();
            angular.forEach(trips,function(trip,key){
                if(TripNotification.isTriggered(trip)){
                    TripNotification.deleteTrip(key);
                }
            });
            $scope.trips = TripNotification.getTrips();
        });

        $scope.listCanSwipe = true;

        $scope.deleteNotification = function(index){
            TripNotification.deleteTrip(index);
            $state.go($state.current, {}, {reload: true});
        }
    })

    /*
     * Ongoing trip controller
     * */
    .controller('CurrentTripCtrl', function($scope, Localstorage, $ionicPopup, $cordovaLocalNotification,
                                            $state, $ionicHistory, $rootScope){
        $scope.$on('$ionicView.beforeEnter', function(){
            $rootScope.$broadcast('inState',{state:'onGoingTrip'});
            //Format trip as an arraylist of stops
            var prepareData = function(trip){
                var tripList = [];
                angular.forEach(trip.LegList.Leg, function(leg){
                    if(leg.type != "WALK") {
                        //Origin station
                        var tripUnit = {
                            type: "Origin",
                            name: leg.Origin.name,
                            time: leg.Origin.time,
                            date: leg.Origin.date,
                            dir: leg.dir,
                            traffictype: leg.type,
                            line: leg.line
                        };
                        tripList.push(tripUnit);
                        angular.forEach(leg.Stops, function(stop){
                            if(parseInt(stop.routeIdx) < parseInt(leg.Destination.routeIdx)
                                && parseInt(stop.routeIdx) > parseInt(leg.Origin.routeIdx) ){
                                //Stop station during the trip
                                var tripUnit = {
                                    type: "Stop",
                                    name: stop.name,
                                    time: stop.depTime,
                                    date: stop.depDate
                                };
                                tripList.push(tripUnit);
                            }
                        });
                        //Destination station
                        tripUnit = {
                            type: "Destination",
                            name: leg.Destination.name,
                            time: leg.Destination.time,
                            date: leg.Destination.date
                        };
                        tripList.push(tripUnit);
                    } else {
                        //Walk
                        var tripUnit = {
                            type: "Walk",
                            dist: leg.dist,
                            time: leg.Destination.time,
                            date: leg.Destination.date
                        };
                        tripList.push(tripUnit);
                    }
                });
                updateStatus(tripList);
                return tripList;
            };
            //Add status to stops. Including finished, todo, ongoing
            var updateStatus = function(tripList){
                var now = new Date();
                angular.forEach(tripList, function(trip){
                    var triptime = new Date(trip.date+"T"+trip.time);
                    triptime = new Date(triptime.getTime()-60*60000);
                    if(now.getTime() > triptime.getTime()){
                        trip.status = "finished";
                    } else {
                        if($scope.foundOnGoingSubTrip){
                            trip.status = "todo";
                        } else {
                            trip.status = "ongoing";
                            $scope.foundOnGoingSubTrip = true;
                        }
                    }
                });
            };

            $scope.trip = Localstorage.getObject('ongoing');
            if($scope.trip == null) {
                $scope.isongoing = false;
            } else {
                $scope.isongoing = true;
                $scope.foundOnGoingSubTrip = false;
                $scope.tripList = prepareData($scope.trip);
            }
        });

        $scope.$on('$ionicView.beforeLeave', function(){
            $rootScope.$broadcast('inState',{state:'leaveOnGoingTrip'});
        });
    });
