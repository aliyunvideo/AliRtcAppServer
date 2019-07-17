var scApp = angular.module("scApp", ["ngRoute", "ngResource",
    "bravoUiAlert", "bravoUiPopover"
]);

scApp.config(["$routeProvider", function($routeProvider){
    $routeProvider.otherwise({redirectTo:"/rtc-check"})
        .when("/rtc-check", {templateUrl:"views/rtc-check.html", controller:"CRTCCheck"})
        .when("/token-check", {templateUrl:"views/token-check.html", controller:"CRTCToken"})
        .when("/webrtc-check", {templateUrl:"views/webrtc-check.html", controller:"CWebRTCCheck"})
}]);

scApp.controller("CSCMain", ["$scope", "$interval", "$location", "$sc_utility", function($scope, $interval, $location, $sc_utility){
    $scope.logs = [];
    // remove expired alert.
    $interval(function(){
        for (var i = 0; i < $scope.logs.length; i++) {
            var log = $scope.logs[i];
            if (log.create + 10000 < new Date().getTime()) {
                $scope.logs.splice(i, 1);
                break;
            }
        }
    }, 3000);

    // handler system log event, from $sc_utility service.
    $scope.$on("$sc_utility_log", function(event, level, msg){
        var log = {
            level:level, msg:msg, create:new Date().getTime()
        };
        // only show 3 msgs.
        while ($scope.logs.length > 2) {
            $scope.logs.splice(0, 1);
        }
        $scope.logs.push(log);
    });

    // handle system error event, from $sc_utility service.
    $scope.$on("$sc_utility_http_error", function(event, status, response){
        if (status != 200) {
            if (!status && !response) {
                response = "无法访问服务器";
            } else {
                response = "HTTP/" + status + ", " + response;
            }
        } else {
            var map = {
            };
            if (map[response.code]) {
                response = "code=" + response.code + ", " + map[response.code];
            } else {
                resonse = "code=" + response.code + ", 系统错误";
            }
        }

        $sc_utility.log("warn", response);
    });

    $scope.go_rtc_check = function() {
        $location.path("/rtc-check");
    };
    $scope.go_token_check = function() {
        $location.path("/token-check");
    };
    $scope.go_webrtc_check = function() {
        $location.path("/webrtc-check");
    };
}]);

scApp.filter("sc_filter_log_level", function(){
    return function(v) {
        return (v == "warn" || v == "error")? "alert-warn":"alert-success";
    };
});

scApp.filter("sc_filter_nav_active", ["$sc_nav", function($sc_nav){
    return function(v){
        return $sc_nav.is_selected(v)? "active":"";
    };
}]);

// the sc nav is the nevigator
scApp.provider("$sc_nav", function(){
    this.$get = function(){
        return {
            selected: null,
            in_rtc_check: function(){
                this.selected = "/rtc-check";
            },
            in_token_check: function(){
                this.selected = "/token-check";
            },
            in_webrtc_check: function(){
                this.selected = "/webrtc-check";
            },
            is_selected: function(v){
                return v == this.selected;
            }
        };
    };
});

// the sc utility is a set of helper utilities.
scApp.provider("$sc_utility", function(){
    this.$get = ["$rootScope", function($rootScope){
        return {
            log: function(level, msg) {
                $rootScope.$broadcast("$sc_utility_log", level, msg);
            },
            http_error: function(status, response) {
                $rootScope.$broadcast("$sc_utility_http_error", status, response);
            },
            find_siblings: function(elem, className) {
                if (elem.hasClass(className)) {
                    return elem;
                }

                if (!elem[0].nextSibling) {
                    return null;
                }

                var sibling = angular.element(elem[0].nextSibling);
                return this.find_siblings(sibling, className);
            },
            refresh: async_refresh2
        };
    }];
});

// sc-collapse: scCollapse
/**
 * Usage:
        <div class="accordion">
            <div class="accordion-group">
                <div class="accordion-heading" sc-collapse="in">
                    <a class="accordion-toggle" href="javascript:void(0)">
                        HTTP RAW API
                    </a>
                </div>
                <div class="accordion-body collapse">
                    <div class="accordion-inner">
                        该服务器不支持HTTP RAW API，或者配置中禁用了该功能。
                    </div>
                </div>
            </div>
        </div>
 */
scApp.directive('scCollapse', ["$sc_utility", function($sc_utility){
    return {
        restrict: 'A',
        scope: true,
        controller: ['$scope', function($scope) {
        }],
        compile: function(elem, attrs) {
            return function(scope, elem, attrs){
                if (attrs.scCollapse == "in") {
                    var obj = $sc_utility.find_siblings(elem, 'accordion-body');
                    obj.addClass('in');
                }

                elem.on('click', function(){
                    var obj = $sc_utility.find_siblings(elem, 'accordion-body');
                    obj.toggleClass('in');
                });
            };
        }
    };
}]);

// config the http interceptor.
scApp.config(['$httpProvider', function($httpProvider){
    $httpProvider.interceptors.push('MHttpInterceptor');
}]);

// the http interceptor.
scApp.factory('MHttpInterceptor', ["$q", "$sc_utility", function($q, $sc_utility){
    // register the interceptor as a service
    // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$http
    // @remark: the function($q) should never add other params.
    return {
        'request': function(config) {
            return config || $q.when(config);
        },
        'requestError': function(rejection) {
            return $q.reject(rejection);
        },
        'response': function(response) {
            if (response.data.code && response.data.code != 0) {
                $sc_utility.http_error(response.status, response.data);
                // the $q.reject, will cause the error function of controller.
                // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$q
                return $q.reject(response);
            }
            return response || $q.when(response);
        },
        'responseError': function(rejection) {
            // When CORS and 404, we may get status 0.
            if (rejection.status == 0) {
                rejection.status = 404;
                if (!rejection.data) {
                    rejection.data = 'FixByMe: CORS NotFound.';
                }
            }

            $sc_utility.http_error(rejection.status, rejection.data);
            return $q.reject(rejection);
        }
    };
}]);
