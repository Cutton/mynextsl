angular.module('starter.services', [])

    .factory('Stations', function ($http, $q) {
        /*
        * API : SL Platsuppslag (https://www.trafiklab.se/api/sl-platsuppslag/sl-platsuppslag)
        *
        * Params: stationQuery - search string
        *         maxresult - number of returned matched results
        *
        * Return: station object array
        *
        *     [
                     {
                         "Name": "Kungshamra (Solna)",
                         "SiteId": "3433",
                         "Type": "Station",
                         "X": "18027354",
                         "Y": "59381940"
                     },
                     ......
              ]
        *
        * */
        var findStationsHttp = function (stationQuery, maxresult) {

            return $http.get("http://api.sl.se/api2/typeahead.json",
                {
                    params: {
                        "key": "d631432840ca4d18871f8989a6d99f9a",
                        "searchstring": stationQuery,
                        "stationonly": "true",
                        "MaxResults": maxresult = typeof maxresult !== 'undefined' ? maxresult : 10
                    }
                });

        };

        var findStations = function (stationQuery, maxresult) {

            return $q.all([findStationsHttp(stationQuery, maxresult)])
                .then(function(results){
                    return results[0].data.ResponseData;
                });

        }
        /*
         * API : SL Realtidsinformation 3
         *       (https://www.trafiklab.se/api/sl-realtidsinformation-3/sl-realtidsinformation-3)
         *
         * Params: siteid - SL siteid
         *         timewindow - time window for departuring time
         *
         * Return: JSON object example
         *
         *     {
                     "StatusCode": 0,
                     "Message": null,
                     "ExecutionTime": 61,
                     "ResponseData": {
                     "LatestUpdate": "2015-07-19T08:42:45",
                     "DataAge": 7,
                     "Metros": [

                     ],
                     "Buses": [
                         {
                             "JourneyDirection": 2,
                             "GroupOfLine": null,
                             "StopAreaName": "Kungshamra",
                             "StopAreaNumber": 50355,
                             "StopPointNumber": 50355,
                             "StopPointDesignation": null,
                             "TimeTabledDateTime": "2015-07-19T08:55:21",
                             "ExpectedDateTime": "2015-07-19T08:55:21",
                             "DisplayTime": "12 min",
                             "Deviations": null,
                             "TransportMode": "BUS",
                             "LineNumber": "540",
                             "Destination": "Universitetet",
                             "SiteId": 3433
                         },
                     ....
                     ],
                     "Trains": [

                     ],
                     "Trams": [

                     ],
                     "Ships": [

                     ],
                     "StopPointDeviations": [

                     ]
                     }
                }
         *
         * */
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
        }

        return {
            findStations: findStations,
            getRealTimeInfo: getRealTimeInfo
        };

    })

    .factory('Planner', function ($http, $q, Stations, Localstorage, $filter) {
        /*
         * API : SL Reseplanerare 2
         *      (https://www.trafiklab.se/api/sl-reseplanerare-2/dokumentation-sl-reseplanerare-2)
         *
         * Params: fromId - origin station siteId
         *         toId - destination station siteOd
         *         Time - current time (When this parameter is not set, SL api will use current time as default
         *                              However, it has delay and isn't accurate, which lead to the coming bus missing)
         *
         * Return: trip object array
         *          (url http://api.sl.se/api2/TravelplannerV2/trip.json?key=[keyString]&originId=3433&destId=9000)
         *
         *
         *
         * */
        var searchRountesHttp = function (fromId, toId, time, searchMode) {
            var currentDate = new Date();
            return $http.get("http://api.sl.se/api2/TravelplannerV2/trip.json",
                {
                    params: {
                        "key": "9d7df7c15c9c4275bc1c821f093a880c",
                        "originId": fromId,
                        "destid": toId,
                        "date": $filter('date')(time, 'yyyy-MM-dd'),
                        "time": $filter('date')(time, 'HH:mm'),
                        "searchForArrival": searchMode == undefined?0:1
                    }
                })
                .success(function (data) {
                    return data.TripList.Trip;
                })
                .error(function (data) {
                    console.log("Fail to get trip data!");
                });
        }
        var searchRountes = function (fromId, toId, time, searchMode) {
            return $q.all([
                searchRountesHttp(fromId, toId, time, searchMode)
            ]).then(function(results){
                return results[0].data.TripList.Trip;
            });
        }

        var getTripDetailsHttp = function (tripref) {
            return $http.get("http://api.sl.se/api2/TravelplannerV2/journeydetail.json?"+tripref,
                {
                    params: {
                        "key": "9d7df7c15c9c4275bc1c821f093a880c"
                    }
                })
        }
        var getTripDetails = function (tripref) {
            return $q.all([
                getTripDetailsHttp(tripref)
            ]).then(function(results){
                return results[0].data.JourneyDetail.Stops.Stop;
            });
        }

        var isFavouriteTrip = function(fromStation, toStation) {
            var isInFavourite = -1;
            var trips = Localstorage.getObject('trips');
            angular.forEach(trips,function(trip,key){
                if(trip.ResOrigin.SiteId == fromStation.SiteId
                    && trip.ResDestination.SiteId == toStation.SiteId){
                    isInFavourite = key;
                }
            });
            return isInFavourite;
        }

        /*
         * Return origin and destination stations data including SiteID according the sub-trip data
         * because sub-trip's origin and destination don't have siteid.
         *
         * Input: sub-trip (Leg) JSON object
         * Output: trip JSON object only includes stations with SideId
         *   {
         *       Origin: {
         *           Name: xxxx,
         *           SiteId: xxxx,
         *           X: ****,
         *           Y: ****,
         *           Type: *****,
         *           ResrobotInfo: {...}
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
                    return $q.all([
                        Stations.getLocationInfo(results[0].data.ResponseData[0]),
                        Stations.getLocationInfo(results[1].data.ResponseData[0])
                    ]).then(
                        function(results){
                            var tripObject = {};
                            tripObject.Origin=results[0];
                            tripObject.Destination=results[1];
                            return tripObject;
                        }
                    );
                }
            );

        }

        /*
        * Get all possbile trips like bus,metro,train, etc between two stations. It is only used for sub-trip
        * by assuming that there is no transfer.
        *
        * Real time information is added, too.
        *
        * Params: fromId: origin siteid
        *         toId: destination siteid
        *
        * Return:
        *
        *   [
        *       {
        *           type: "BUS",
        *           line: "540",
        *           dir: "XXXXXXX"
        *           schedule: [
        *               {"3 min"},
        *               {"14:33"},
        *               .....
        *           ]
        *       },
        *       .....
        *   ]
        *
        * */

        var getAvailableWays = function (fromId, toId) {

            var ways = [];

            return searchRountes(fromId, toId).then(function (result) {

                angular.forEach(result.data.TripList.Trip, function (trip) {
                    var newway = {
                        type: trip.LegList.Leg.type,
                        line: trip.LegList.Leg.line,
                        dir: trip.LegList.Leg.dir,
                        time: [{departure:trip.LegList.Leg.Origin.time,arrival:trip.LegList.Leg.Destination.time}],
                        schedule: []
                    };

                    if(ways.length == 0) {
                        ways.push(newway);
                    } else {

                        var isnew = true;
                        for(i=0;i<ways.length;i++){
                            if(ways[i].type == newway.type &&
                                ways[i].line == newway.line &&
                                ways[i].dir == newway.dir) {
                                ways[i].time.push({departure:newway.time[0].departure,arrival:newway.time[0].arrival});
                                isnew = false;
                                break;
                            }
                        }
                        if(isnew) {
                            ways.push(newway);
                        }
                    }
                });

                return getAllWaysSchedule(ways,fromId).then(function(result){
                    return result;
                });
            });
        }


        /*
        * Get realtime info, find matched bus,metro,etc and then add next
        * departuring time into it.
        * */
        var getAllWaysSchedule = function(ways,siteid){
            return Stations.getRealTimeInfo(siteid).then(function(result){
                var realTimeInfo = result.data.ResponseData;
                angular.forEach(ways, function(way){
                    if(way.type == "BUS"){
                        angular.forEach(realTimeInfo.Buses,function(bus){
                            if(way.line == bus.LineNumber && way.dir == bus.Destination) {
                                way.schedule.push(bus.ExpectedDateTime);
                            }
                        });
                    } else if(way.type == "METRO") {

                        angular.forEach(realTimeInfo.Metros,function(metro){
                            if(way.line == metro.LineNumber && way.dir == metro.Destination) {
                                way.schedule.push(metro.DisplayTime);
                            }
                        });
                    } else if(way.type == "TRAIN") {
                        angular.forEach(realTimeInfo.Trains,function(train){
                            if(way.line == train.LineNumber && way.dir == train.Destination) {
                                way.schedule.push(train.ExpectedDateTime);
                            }
                        });
                    }
                });

                angular.forEach(ways, function(way){
                    var loop = way.time.length < way.schedule.length? way.time.length:way.schedule.length;
                    if(way.type == "BUS" || way.type == "TRAIN"){
                        for(i=0; i<loop; i++){
                            var realTime = new Date(way.schedule[i]);
                            //Since schedule time doesn't contain GMT info and set as UTC time, fix by -2.
                            realTime.setHours(realTime.getHours()-2);

                            /**Debug code for fixing timezone difference**/
                            //realTime.setHours(realTime.getUTCHours());

                            var scheduleTime = new Date();
                            scheduleTime.setHours(way.time[i].departure.substr(0,2));
                            scheduleTime.setMinutes(way.time[i].departure.substr(3,5));

                            way.time[i].delay = Math.round((realTime - scheduleTime)/60000);
                        }
                    }

                });
                return ways;
            });
        }


        var selectedTrip = {};

        return {
            searchRountes: searchRountes,
            getTripOnlyWithStation: getTripOnlyWithStation,
            getAvailableWays: getAvailableWays,
            getTripDetails: getTripDetails,
            isFavouriteTrip: isFavouriteTrip,
            setFrom: function (station) {
                fromStation = station;
                Localstorage.setObject("fromStation", station);
            },
            setTo: function (station) {
                Localstorage.setObject("toStation", station);
            },
            getFrom: function () {
                return Localstorage.getObject("fromStation");
            },
            getTo: function () {
                return Localstorage.getObject("toStation");
            },
            setSelectedTrip: function(trip) {
                selectedTrip = trip;
            },
            getSelectedTrip: function() {
                return selectedTrip;
            }
        };

    })

    .factory('TripNotification', function ($http, Localstorage, $cordovaLocalNotification) {
        var addNotification = function(trip){
            var triptime = new Date(trip.LegList.Leg[0].Origin.date+"T"+trip.LegList.Leg[0].Origin.time);
            triptime = new Date(triptime.getTime()-120*60000);
            var alerttime = new Date(triptime - trip.notifyTime*60000);
            trip.alertTime = alerttime;
            var startTimeStr = trip.LegList.Leg[0].Origin.time;
            var endTimeStr = trip.LegList.Leg[trip.LegList.Leg.length-1].Destination.time;
            var notification = {
                id: parseInt(trip.LegList.Leg[0].Origin.id)
                +parseInt(startTimeStr.substr(0,2)+startTimeStr.substr(3,2))
                +parseInt(endTimeStr.substr(0,2)+endTimeStr.substr(3,2)),
                text: 'The trip from '+trip.LegList.Leg[0].Origin.name+' to '
                +trip.LegList.Leg[trip.LegList.Leg.length-1].Destination.name
                +' will start '+trip.notifyTime+' mintues later, at '+trip.LegList.Leg[0].Origin.time,
                at: alerttime
            }
            if(Localstorage.getObject("notification")){
                $cordovaLocalNotification.schedule(notification).then(function(){
                    console.log("Notfication for trip is added!");
                });
            } else {
                console.log("Notfication for trip is added!");
            }

        }

        var cancelNotification = function(trip){
            var startTimeStr = trip.Origin.time;
            var endTimeStr = trip.Destination.time
            var id = parseInt(trip.Origin.id)
                +parseInt(startTimeStr.substr(0,2)+startTimeStr.substr(3,2))
                +parseInt(endTimeStr.substr(0,2)+endTimeStr.substr(3,2));

            if(Localstorage.getObject("notification")){
                $cordovaLocalNotification.cancel(id);
            } else {
                console.log("Notfication cancelled!");
            }

        }

        return {
            getTrips: function(){
                if(Localstorage.getObject("notifiedTrips") == null) {
                    Localstorage.setObject("notifiedTrips",[]);
                }
                return Localstorage.getObject("notifiedTrips");
            },
            addTrip: function(trip){
                if(Localstorage.getObject("notifiedTrips") == null) {
                    Localstorage.setObject("notifiedTrips",[]);
                }
                addNotification(trip);
                var trips = Localstorage.getObject("notifiedTrips");
                console.log(trip.alertTime);
                trips.push(trip);
                Localstorage.setObject("notifiedTrips",trips);

            },
            deleteTrip: function(index){
                var trips = Localstorage.getObject("notifiedTrips");
                cancelNotification(trips[index]);
                trips.splice(index, 1);
                Localstorage.setObject("notifiedTrips",trips);
            },
            isInQueue: function(targetTrip){
                var result = null;
                if(Localstorage.getObject("notifiedTrips") == null) {
                    Localstorage.setObject("notifiedTrips",[]);
                }
                var trips = Localstorage.getObject("notifiedTrips");
                angular.forEach(trips, function(trip){
                    if(targetTrip.Origin.name == trip.Origin.name
                    && targetTrip.Origin.time == trip.Origin.time
                    && targetTrip.Origin.date == trip.Origin.date
                    && targetTrip.Destination.name == trip.Destination.name
                    && targetTrip.Destination.time == trip.Destination.time
                    && targetTrip.Destination.date == trip.Destination.date){
                        result = trip.alertTime;
                    }
                });
                return result;
            },
            getTripIndex: function(targetTrip){
                var result = -1;
                var trips = Localstorage.getObject("notifiedTrips");
                angular.forEach(trips, function(trip, key){
                    if(targetTrip.Origin.name == trip.Origin.name
                        && targetTrip.Origin.time == trip.Origin.time
                        && targetTrip.Origin.date == trip.Origin.date
                        && targetTrip.Destination.name == trip.Destination.name
                        && targetTrip.Destination.time == trip.Destination.time
                        && targetTrip.Destination.date == trip.Destination.date){
                        result = key;
                    }
                });
                return result;
            },
            isTriggered: function(trip){
                var result = false;
                var now = new Date();
                var startTime = new Date(trip.Origin.date+"T"+trip.Origin.time);
                startTime = new Date(startTime.getTime()-120*60000);
                if((startTime.getTime()-now.getTime())<trip.notifyTime*60000){
                    result = true;
                }
                return result;
            }
        }
    })

    .factory('Utility', function () {

        /*
        * timeStr format : 2015-10-04T12:34 (no Timezong str)
        * */
        var getLeftTimeAsMintues = function(timeStr){
            var now = new Date();
            var targetTime = new Date(timeStr);
            //Add time zone, since iOS doesn't support "+0200"
            targetTime = new Date(targetTime.getTime()-120*60000);
            var leftMinutes = Math.round((targetTime.getTime()-now.getTime())/60000);
            if(leftMinutes < 0){
                leftMinutes = 0;
            }
            return leftMinutes;
        }

        return {
            getLeftTimeAsMintues: getLeftTimeAsMintues
        }
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


