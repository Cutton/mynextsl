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

        var findStations = function (stationQuery) {

            var stations = null;

            return $http.get("http://api.sl.se/api2/typeahead.json",
                {
                    params: {
                        "key": "d631432840ca4d18871f8989a6d99f9a",
                        "searchstring": stationQuery,
                        "stationonly": "true"
                    }
                })
                .success(function (data) {
                    stations = data.ResponseData;
                    return data.ResponseData;
                })
                .error(function (data) {
                    console.log("Fail to get station data!");
                });
        };

        return {
            findStations: findStations
        };

    })

    .factory('Planner', function ($http) {

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

        var fromStation = {};
        var toStation = {};
        //var fromStation = {Name: "Kungshamra (Solna)", SiteId: "3433", Type: "Station", X: "18027354", Y: "59381940"};
        //var toStation = {Name: "Stockholms C (Stockholm)", SiteId: "9000", Type: "Station", X: "18057656", Y: "59331133"};

        return {
            searchRountes: searchRountes,
            setFrom: function(station) {
                fromStation = station;
                console.log(station);
            },
            setTo: function(station) {
                toStation = station;
                console.log(station);
            },
            getFrom: function(station) {
                return fromStation;
            },
            getTo: function(station) {
                return toStation;
            }
        };

    });


