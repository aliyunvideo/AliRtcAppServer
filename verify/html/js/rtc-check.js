
scApp.controller("CWebRTCCheck", ["$scope", "$location", "$sc_utility", "$sc_nav", "MRTCCheck", function($scope, $location, $sc_utility, $sc_nav, MRTCCheck){
	setTimeout(function(){
		//window.location.href = 'webrtc_check.html';
	}, 1000)

	//$location.url("webrtc_check.html");
    $sc_nav.in_webrtc_check();
    $sc_utility.refresh.stop();
}]);

scApp.controller("CRTCToken", ["$scope", "$location", "$sc_utility", "$sc_nav", "MRTCCheck", function($scope, $location, $sc_utility, $sc_nav, MRTCCheck){
	$scope.input = {
		appid:null, channelID:null, appKey:null,
		userid:null, nonce:null, timestamp:null,
		token:null
	};

	$scope.control = {
		show:false, expect:null, actual:null
	};

	$scope.checkToken = function() {
		$scope.control.state = 0;

		if (!$scope.input.appid) {
			$sc_utility.log('error', "Please input AppID");
			return;
		}
		if (!$scope.input.channelID) {
			$sc_utility.log('error', "Please input ChannelID");
			return;
		}
		if (!$scope.input.appKey) {
			$sc_utility.log('error', "Please input AppKey");
			return;
		}
		if (!$scope.input.userid) {
			$sc_utility.log('error', "Please input UserID");
			return;
		}
		if (!$scope.input.nonce) {
			$sc_utility.log('error', "Please input Nonce");
			return;
		}
		if (!$scope.input.timestamp) {
			$sc_utility.log('error', "Please input Timestamp");
			return;
		}
		if (!$scope.input.token) {
			$sc_utility.log('error', "Please input Token");
			return;
		}

		if ($scope.input.appKey.length < 32) {
			$sc_utility.log('error', "Invalid AppKey length, should >=32 bytes.");
			return;
		}

		var h = new sjcl.hash.sha256();
		h.update($scope.input.appid);
		h.update($scope.input.appKey);
		h.update($scope.input.channelID);
		h.update($scope.input.userid);
		h.update($scope.input.nonce);
		h.update($scope.input.timestamp);
		$scope.control.actual = $scope.input.token;
		$scope.control.expect = sjcl.codec.hex.fromBits(h.finalize());
		$scope.control.show = true;
	};

	if ($location.search().appid) {
		$scope.input.appid = $location.search().appid;
	}
	if ($location.search().channel) {
		$scope.input.channelID = $location.search().channel;
	}
	if ($location.search().room) {
		$scope.input.channelID = $location.search().room;
	}
	if ($location.search().appKey) {
		$scope.input.appKey = $location.search().appKey;
	}
	if ($location.search().userid) {
		$scope.input.userid = $location.search().userid;
	}
	if ($location.search().nonce) {
		$scope.input.nonce = $location.search().nonce;
	}
	if ($location.search().timestamp) {
		$scope.input.timestamp = $location.search().timestamp;
	}
	if ($location.search().token) {
		$scope.input.token = $location.search().token;
	}

    $sc_nav.in_token_check();
    $sc_utility.refresh.stop();
}]);

scApp.filter("tc_filter_token", function(){
    return function(control) {
        if (!control) {
            return 'muted';
        }

        return control.actual == control.expect ? 'text-success' : 'text-error';
    };
});

scApp.controller("CRTCCheck", ["$scope", "$location", "$sc_utility", "$sc_nav", "MRTCCheck", function($scope, $location, $sc_utility, $sc_nav, MRTCCheck){
	$scope.db = {
		appid:null, gslb:null, nonce:null, session:null, timestamp:null,
		userid:null, token:null, turn: {
			username:null, password:null
		}
	};

	$scope.input = {
		server:null, room:null, user:null, password:null
	};

	$scope.control = {
		state:0, code:null,
		url:null, starttime:null,
		status:null, endtime:null, cost:null,
		message:null, nonce:null
	};

	var gotResponse = function() {
		$scope.control.state = 2;
		$scope.control.endtime = new Date();
		$scope.control.cost = $scope.control.endtime.getTime() - $scope.control.starttime.getTime();
	};

	var requestAppServer = function(url) {
		MRTCCheck.check_app_server(url, function(auth){
			$scope.db.appid = auth.appid;
			$scope.db.gslb = auth.gslb;
			$scope.db.nonce = auth.nonce;
			$scope.db.session = auth.session;
			$scope.db.timestamp = auth.timestamp;
			$scope.db.userid = auth.userid;
			$scope.db.token = auth.token;
			$scope.db.turn.username = auth.turn.username;
			$scope.db.turn.password = auth.turn.password;

			gotResponse();

			$scope.control.nonce = auth.nonce;
			$scope.control.code = 200;
			$scope.control.state = 3;
		}, function(response, status){
			gotResponse();

			$scope.control.code = status;
			$scope.control.message = response;
			$scope.control.state = 3;
		});
	};

	$scope.checkAppServer = function() {
		$scope.control.state = 0;

		if (!$scope.input.server) {
			$sc_utility.log('error', "Please input AppServer");
			return;
		}
		if (!$scope.input.room) {
			$sc_utility.log('error', "Please input Room");
			return;
		}
		if (!$scope.input.user) {
			$sc_utility.log('error', "Please input Nick Name");
			return;
		}
		if (!$scope.input.password) {
			$sc_utility.log('error', "Please input Password");
			return;
		}

		$scope.control.state = 1;

		var url = $scope.input.server + '?room=' + $scope.input.room
			+ '&user=' + $scope.input.user + '&passwd=' + $scope.input.password;
		$scope.control.url = url;
		$scope.control.starttime = new Date();

		setTimeout(requestAppServer, 0, url);
	};

	var url = "";
	if ($location.search().schema) {
		url += $location.search().schema + "://";
	}
	if ($location.search().host) {
		url += $location.search().host;
	}
	if ($location.search().port) {
		url += ':' + $location.search().port;
	}
	if ($location.search().path) {
		url += $location.search().path;
	}
	if (url) {
		$scope.input.server = url;
	}

	if ($location.search().room) {
		$scope.input.room = $location.search().room;
	}
	if ($location.search().channel) {
		$scope.input.room = $location.search().channel;
	}
	if ($location.search().user) {
		$scope.input.user = $location.search().user;
	}
	if ($location.search().password) {
		$scope.input.password = $location.search().password;
	}

    $sc_nav.in_rtc_check();
    $sc_utility.refresh.stop();
}]);

scApp.filter("tc_filter_http", function(){
    return function(control) {
        if (!control || !control.code) {
            return 'muted';
        }

        if (control.nonce && control.nonce.indexOf('RCV-') == 0) {
            return 'text-warning';
        } else if (control.code == 200) {
            return 'text-success';
        } else {
	        return 'text-error';
        }
    };
});

scApp.filter("tc_filter_status", function(){
    return function(control) {
        if (!control || !control.code) {
            return '';
        }

        if (control.nonce && control.nonce.indexOf('RCV-') == 0) {
            return 'Warning: Recovered from OpenAPI error';
        } else {
	        return statusMap[control.code];
        }
    };
});

scApp.factory("MRTCCheck", ["$http", function($http){
    return {
        check_app_server: function(url, success, fail) {
            $http.post(url).success(function(data){
                success(data.data);
            }).error(function(r0, r1, r2, r3){
                fail(r0, r1, r2, r3);
            });
        }
    };
}]);

var statusMap = {};

var HTTP_Continue                       = 100;
var HTTP_SwitchingProtocols             = 101;
var HTTP_OK                             = 200;
var HTTP_Created                        = 201;
var HTTP_Accepted                       = 202;
var HTTP_NonAuthoritativeInformation    = 203;
var HTTP_NoContent                      = 204;
var HTTP_ResetContent                   = 205;
var HTTP_PartialContent                 = 206;
var HTTP_MultipleChoices                = 300;
var HTTP_MovedPermanently               = 301;
var HTTP_Found                          = 302;
var HTTP_SeeOther                       = 303;
var HTTP_NotModified                    = 304;
var HTTP_UseProxy                       = 305;
var HTTP_TemporaryRedirect              = 307;
var HTTP_BadRequest                     = 400;
var HTTP_Unauthorized                   = 401;
var HTTP_PaymentRequired                = 402;
var HTTP_Forbidden                      = 403;
var HTTP_NotFound                       = 404;
var HTTP_MethodNotAllowed               = 405;
var HTTP_NotAcceptable                  = 406;
var HTTP_ProxyAuthenticationRequired    = 407;
var HTTP_RequestTimeout                 = 408;
var HTTP_Conflict                       = 409;
var HTTP_Gone                           = 410;
var HTTP_LengthRequired                 = 411;
var HTTP_PreconditionFailed             = 412;
var HTTP_RequestEntityTooLarge          = 413;
var HTTP_RequestURITooLarge             = 414;
var HTTP_UnsupportedMediaType           = 415;
var HTTP_RequestedRangeNotSatisfiable   = 416;
var HTTP_ExpectationFailed              = 417;
var HTTP_InternalServerError            = 500;
var HTTP_NotImplemented                 = 501;
var HTTP_BadGateway                     = 502;
var HTTP_ServiceUnavailable             = 503;
var HTTP_GatewayTimeout                 = 504;
var HTTP_HTTPVersionNotSupported        = 505;

statusMap[HTTP_Continue] = "Continue";
statusMap[HTTP_SwitchingProtocols] = "Switching Protocols";
statusMap[HTTP_OK] = "OK";
statusMap[HTTP_Created] = "Created";
statusMap[HTTP_Accepted] = "Accepted";
statusMap[HTTP_NonAuthoritativeInformation] = "Non Authoritative Information";
statusMap[HTTP_NoContent] = "No Content";
statusMap[HTTP_ResetContent] = "Reset Content";
statusMap[HTTP_PartialContent] = "Partial Content";
statusMap[HTTP_MultipleChoices] = "Multiple Choices";
statusMap[HTTP_MovedPermanently] = "Moved Permanently";
statusMap[HTTP_Found] = "Found";
statusMap[HTTP_SeeOther] = "See Other";
statusMap[HTTP_NotModified] = "Not Modified";
statusMap[HTTP_UseProxy] = "Use Proxy";
statusMap[HTTP_TemporaryRedirect] = "Temporary Redirect";
statusMap[HTTP_BadRequest] = "Bad Request";
statusMap[HTTP_Unauthorized] = "Unauthorized";
statusMap[HTTP_PaymentRequired] = "Payment Required";
statusMap[HTTP_Forbidden] = "Forbidden";
statusMap[HTTP_NotFound] = "Not Found";
statusMap[HTTP_MethodNotAllowed] = "Method Not Allowed";
statusMap[HTTP_NotAcceptable] = "Not Acceptable";
statusMap[HTTP_ProxyAuthenticationRequired] = "Proxy Authentication Required";
statusMap[HTTP_RequestTimeout] = "Request Timeout";
statusMap[HTTP_Conflict] = "Conflict";
statusMap[HTTP_Gone] = "Gone";
statusMap[HTTP_LengthRequired] = "Length Required";
statusMap[HTTP_PreconditionFailed] = "Precondition Failed";
statusMap[HTTP_RequestEntityTooLarge] = "Request Entity Too Large";
statusMap[HTTP_RequestURITooLarge] = "Request URI Too Large";
statusMap[HTTP_UnsupportedMediaType] = "Unsupported Media Type";
statusMap[HTTP_RequestedRangeNotSatisfiable] = "Requested Range Not Satisfiable";
statusMap[HTTP_ExpectationFailed] = "Expectation Failed";
statusMap[HTTP_InternalServerError] = "Internal Server Error";
statusMap[HTTP_NotImplemented] = "Not Implemented";
statusMap[HTTP_BadGateway] = "Bad Gateway";
statusMap[HTTP_ServiceUnavailable] = "Service Unavailable";
statusMap[HTTP_GatewayTimeout] = "Gateway Timeout";
statusMap[HTTP_HTTPVersionNotSupported] = "HTTP Version Not Supported";
