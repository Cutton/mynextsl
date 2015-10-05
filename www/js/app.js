// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngIOS9UIWebViewPatch', 'ngCordova'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }
  });
})

  /*
    * Customized directive html tag for making input field be focused when page is actived.
    */
.directive('focusMe', function($timeout) {
  return {
    link: function(scope, element, attrs) {
      $timeout(function() {
        element[0].focus();
      }, 150);
    }
  };
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js


  /*
  * Init localStorage with user's favorite trips.
  * */
  if (!localStorage.getItem('trips')) {
    console.log('Init trips!');
    localStorage['trips'] = null;
  }
  if (!localStorage.getItem('ongoing')) {
    console.log('Init ongoing!');
    localStorage['ongoing'] = null;
  }
  if (!localStorage.getItem('notifiedTrips')) {
    console.log('Init notifiedTrips!');
    localStorage['notifiedTrips'] = null;
  }




  $stateProvider

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    controller: "FooterCtrl"
  })

  // Each tab has its own nav history stack:

  .state('tab.mytrips', {
    url: '/mytrips',
    views: {
      'tab-mytrips': {
        templateUrl: 'templates/tab-mytrips.html',
        controller: 'TripCtrl'
      }
    }
  })
      .state('tab.trip-info1', {
        url: '/mytrips/trip/:tripIndex',
        views: {
          'tab-mytrips': {
            templateUrl: 'templates/tab-tripinfo.html',
            controller: 'TripInfoCtrl'
          }
        }
      })
      .state('tab.mytrips-currenttrip',{
        url: '/mytrips/currenttrip',
        views: {
          'tab-mytrips': {
            templateUrl: 'templates/tab-currenttrip.html',
            controller: 'CurrentTripCtrl'
          }
        }
      })

  .state('tab.planner', {
    url: '/planner',
    views: {
      'tab-planner': {
        templateUrl: 'templates/tab-planner.html',
        controller: 'PlannerCtrl'
      }
    }
  })
      .state('tab.selectstation', {
        url: '/planner/station/:fromorto',
        views: {
          'tab-planner': {
            templateUrl: 'templates/tab-station.html',
            controller: 'StationCtrl'
          }
        }
      })
      .state('tab.trip-info', {
        url: '/planner/trip/:tripIndex',
        views: {
          'tab-planner': {
            templateUrl: 'templates/tab-tripinfo.html',
            controller: 'TripInfoCtrl'
          }
        }
      })
      .state('tab.planner-currenttrip',{
        url: '/planner/currenttrip',
        views: {
          'tab-planner': {
            templateUrl: 'templates/tab-currenttrip.html',
            controller: 'CurrentTripCtrl'
          }
        }
      })

  .state('tab.notifiedTrip', {
    url: '/notifiedTrip',
    views: {
      'tab-notifiedTrip': {
        templateUrl: 'templates/tab-notifiedTrip.html',
        controller: 'NotifiedTripCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/mytrips');

});
