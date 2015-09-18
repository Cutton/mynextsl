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

        /*
         * API : Resrobot StationInZone (https://www.trafiklab.se/api/resrobot-sok-resa/stationsinzone)
         *
         * Params: SL Station Object
         *          {
         *              "Name" : "Kungshamra (Solna)",
         *              "SiteId": "3433",
         *              "Type": "Station",
         *              "X": "18027354",
         *              "Y": "59381940"
         *          }
         *
         * Return: JSON object example
         *
         *          {
         *              "Name" : "Kungshamra (Solna)",
         *              "SiteId": "3433",
         *              "Type": "Station",
         *              "X": "18027354",
         *              "Y": "59381940"
         *              "ResrobotInfo": {
         *                                   "@id": "7445577",
         *                                    "@x": "18.036733",
         *                                    "@y": "59.381854",
         *                                    "name": "Bergshamra centrum",
         *                                    "municipality": {
         *                                                       "@id": "84",
         *                                                       "@county_id": "1",
         *                                                       "#text": "Solna"
         *                                    },
         *                                    "transportlist": {
         *                                                        "transport": {
         *                                                               "@type": "BLT",
         *                                                               "@displaytype": "B"
         *                                                        }
         *                                    },
         *                                    "producerlist": {
         *                                                    "producer": {
         *                                                       "@id": "275"
         *                                                    }
         *                                    }
         *                               }
         *          }
         * */

        var getLocationInfoHttp = function(slStation){
            return $http.get("https://api.trafiklab.se/samtrafiken/resrobot/StationsInZone.json",
                {
                    params: {
                        "key": "eGASZLdsym9cEXpHIU8xmkvtjTasGy3t",
                        "apiVersion": "2.1",
                        "radius": "100",
                        "coordSys": "WGS84",
                        /*Format 18036733 as 18.036733*/
                        "centerX": slStation.X.substr(0, 2) + "." + slStation.X.substr(2),
                        "centerY": slStation.Y.substr(0, 2) + "." + slStation.Y.substr(2)
                    }
                })
        }

        var getLocationInfo = function(slStation){
            return $q.all([
                getLocationInfoHttp(slStation)
            ]).then(
                function(results) {
                    console.log(results);
                    if(angular.isArray(results[0].data.stationsinzoneresult.location)) {
                        /*Find more than one location, select the first one*/
                        slStation.ResrobotInfo = results[0].data.stationsinzoneresult.location[0];
                    } else {
                        /*Only one location matched*/
                        slStation.ResrobotInfo = results[0].data.stationsinzoneresult.location;
                    }
                    return slStation;
                }
            );

        }

        return {
            findStations: findStations,
            getRealTimeInfo: getRealTimeInfo,
            getLocationInfo: getLocationInfo
        };

    })

    .factory('Planner', function ($http, $q, Stations, Localstorage) {


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

        var searchRountesHttp = function (fromId, toId) {
            var currentDate = new Date();
            return $http.get("http://api.sl.se/api2/TravelplannerV2/trip.json",
                {
                    params: {
                        "key": "9d7df7c15c9c4275bc1c821f093a880c",
                        "originId": fromId,
                        "destid": toId,
                        "Time": currentDate.getHours()+":"+currentDate.getMinutes()
                    }
                })
                .success(function (data) {
                    return data.TripList.Trip;
                })
                .error(function (data) {
                    console.log("Fail to get trip data!");
                });
        }

        var searchRountes = function (fromId, toId) {
            return $q.all([
                searchRountesHttp(fromId, toId)
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


