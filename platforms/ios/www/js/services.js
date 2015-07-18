angular.module('starter.services', [])

    .factory('Chats', function () {
        // Might use a resource here that returns a JSON array

        // Some fake testing data
        var chats = [{
            id: 0,
            name: 'Ben Sparrow',
            lastText: 'You on your way?',
            face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
        }, {
            id: 1,
            name: 'Max Lynx',
            lastText: 'Hey, it\'s me',
            face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
        }, {
            id: 2,
            name: 'Adam Bradleyson',
            lastText: 'I should buy a boat',
            face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
        }, {
            id: 3,
            name: 'Perry Governor',
            lastText: 'Look at my mukluks!',
            face: 'https://pbs.twimg.com/profile_images/598205061232103424/3j5HUXMY.png'
        }, {
            id: 4,
            name: 'Mike Harrington',
            lastText: 'This is wicked good ice cream.',
            face: 'https://pbs.twimg.com/profile_images/578237281384841216/R3ae1n61.png'
        }];

        return {
            all: function () {
                return chats;
            },
            remove: function (chat) {
                chats.splice(chats.indexOf(chat), 1);
            },
            get: function (chatId) {
                for (var i = 0; i < chats.length; i++) {
                    if (chats[i].id === parseInt(chatId)) {
                        return chats[i];
                    }
                }
                return null;
            }
        };
    })


    .factory('Stations', function ($http) {

        var findStations = function (stationQuery, maxresult) {

            return $http.get("http://api.sl.se/api2/typeahead.json",
                {
                    params: {
                        "key": "d631432840ca4d18871f8989a6d99f9a",
                        "searchstring": stationQuery,
                        "stationonly": "true",
                        "MaxResults": maxresult = typeof maxresult !== 'undefined' ? maxresult : 10
                    }
                })
                .success(function (data) {
                    return data.ResponseData;
                })
                .error(function (data) {
                    console.log("Fail to get trip data!");
                });
        };

        var getRealTimeInfo = function(siteid,timewindow){
            return $http.get("http://api.sl.se/api2/realtimedepartures.json",
                {
                    params: {
                        "key": "ce3ac4eb12e54651b77f9fa3c63fb6e1",
                        "siteid": siteid,
                        "timewindow": timewindow = typeof timewindow  !== 'undefined' ? timewindow  : 30
                    }
                })
                .success(function (data) {
                    return data.ResponseData;
                })
                .error(function (data) {
                    console.log("Fail to get realtime data!");
                });
        };

        return {
            findStations: findStations,
            getRealTimeInfo: getRealTimeInfo
        };

    })

    .factory('Planner', function ($http, $q, Stations) {

        var searchRountes = function (fromId, toId) {
            return $http.get("http://api.sl.se/api2/TravelplannerV2/trip.json",
                {
                    params: {
                        "key": "9d7df7c15c9c4275bc1c821f093a880c",
                        "originId": fromId,
                        "destid": toId
                    }
                })
                .success(function (data) {
                    return data.TripList.Trip;
                })
                .error(function (data) {
                    console.log("Fail to get trip data!");
                });
        }

        /*
         * Search station name and get Siteid
         *
         * Input: sub-trip (Leg) JSON object
         * Output: trip JSON object only includes stations with SideId
         *   {
         *       Origin: {
         *           Name: xxxx,
         *           SiteId: xxxx
         *       },
         *       Destination: {
         *           Name: xxxx,
         *           SiteId: xxxx
         *       }
         *   }
         */
        var getTripOnlyWithStation = function (leg) {

            return $q.all([
                Stations.findStations(leg.Origin.name, 1),
                Stations.findStations(leg.Destination.name, 1)
            ]).then(
                function (results) {
                    var tripObject = {};
                    tripObject.Origin = results[0].data.ResponseData[0];
                    tripObject.Destination = results[1].data.ResponseData[0];
                    return tripObject
                }
            );

        }

        var getAvailableWays = function (fromId, toId) {

            var ways = [];

            return searchRountes(fromId, toId).then(function (result) {

                angular.forEach(result.data.TripList.Trip, function (trip) {
                    var newway = {
                        type: trip.LegList.Leg.type,
                        line: trip.LegList.Leg.line,
                        dir: trip.LegList.Leg.dir,
                        schedule: []
                    };

                    if(ways.length == 0) {
                        ways.push(newway);
                    }

                    var isnew = true;
                    for(i=0;i<ways.length;i++){
                        if(ways[i].type == newway.type &&
                            ways[i].line == newway.line &&
                            ways[i].dir == newway.dir) {
                            isnew = false;
                            break;
                        }
                    }
                    if(isnew) {
                        ways.push(newway);
                    }
                });

                return getAllWaysSchedule(ways,fromId).then(function(result){
                    return result;
                });
            });
        }

        var getAllWaysSchedule = function(ways,siteid){
            return Stations.getRealTimeInfo(siteid).then(function(result){
                var realTimeInfo = result.data.ResponseData;
                angular.forEach(ways, function(way){
                    if(way.type == "BUS"){
                        angular.forEach(realTimeInfo.Buses,function(bus){
                            if(way.line == bus.LineNumber && way.dir == bus.Destination) {
                                way.schedule.push(bus.DisplayTime);
                            }
                        });
                    } else if(way.type == "METRO") {

                        angular.forEach(realTimeInfo.Metros,function(metro){
                            console.log(metro.LineNumber + "--" + metro.Destination+ "--" + metro.DisplayTime)
                            if(way.line == metro.LineNumber && way.dir == metro.Destination) {
                                way.schedule.push(metro.DisplayTime);
                            }
                        });
                    } else if(way.type == "TRAIN") {
                        angular.forEach(realTimeInfo.Trains,function(train){
                            console.log(train.LineNumber + "--" + train.Destination+ "--" + train.DisplayTime)
                            if(way.line == train.LineNumber && way.dir == train.Destination) {
                                way.schedule.push(train.DisplayTime);
                            }
                        });
                    }
                });
                return ways;
            });
        }

        //var fromStation = {};
        //var toStation = {};
        var fromStation = {Name: "Kungshamra (Solna)", SiteId: "3433", Type: "Station", X: "18027354", Y: "59381940"};
        var toStation = {
            Name: "Stockholms C (Stockholm)",
            SiteId: "9000",
            Type: "Station",
            X: "18057656",
            Y: "59331133"
        };

        return {
            searchRountes: searchRountes,
            getTripOnlyWithStation: getTripOnlyWithStation,
            getAvailableWays: getAvailableWays,
            setFrom: function (station) {
                fromStation = station;
            },
            setTo: function (station) {
                toStation = station;
            },
            getFrom: function (station) {
                return fromStation;
            },
            getTo: function (station) {
                return toStation;
            }
        };

    })

    .factory('Localstorage', ['$window', function ($window) {
        return {
            set: function (key, value) {
                $window.localStorage[key] = value;
            },
            get: function (key, defaultValue) {
                return $window.localStorage[key] || defaultValue;
            },
            setObject: function (key, value) {
                $window.localStorage[key] = JSON.stringify(value);
            },
            getObject: function (key) {
                return JSON.parse($window.localStorage[key] || '{}');
            }
        }
    }]);


