var config = require('./config');
console.log('Server listen=' + config.listen + ', appid=' + config.appId
	+ ', akId=' + config.accessKeyId + ', akSecret=' + config.accessKeySecret
	+ ', gslb=' + config.gslb + ', region=' + config.endpoint);

const http = require('http');

var channels = {};

const url = require('url');
const query = require('querystring');
const uuidv4 = require('uuid/v4');

const server = http.createServer((req, res) => {
	if (req.headers['Origin'] != '') {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,PUT,DELETE,OPTIONS");
			res.setHeader("Access-Control-Expose-Headers", "Server,Range,Content-Length,Content-Range");
			res.setHeader("Access-Control-Allow-Headers", "Origin,Range,Accept-Encoding,Referer,Cache-Control,X-Proxy-Authorization,X-Requested-With,Content-Type");
	}

	if (req.method == "OPTIONS") {
		res.end();
		return;
	}

	var q = query.parse(url.parse(req.url).query);
	var channelId = q['room'];
	var user = q['user'];
	var channelUrl = config.appId + '/' + channelId;
	console.log('Request channelId=' + channelId + ', user=' + user + ', appid=' + config.appId);

	var starttime = new Date();
	Promise.resolve().then(()=>{
		var auth = channels[channelUrl];
		if (auth) {
			return auth;
		}

		return CreateChannel(config.appId, channelId, config.accessKeyId, config.accessKeySecret, config.endpoint).then((auth) => {
			// If recovered from error, we should never cache it,
			// and we should try to request again next time.
			if (!auth.recoverd) {
				channels[channelUrl] = auth;
			}

			var duration = parseInt(new Date().getTime() - starttime.getTime());
			console.log('Create requestId=' + auth.requestId + ', cost=' + duration + 'ms, channelId=' + channelId
				+ ', nonce=' + auth.nonce + ', timestamp=' + auth.timestamp + ', channelKey='
				+ auth.channelKey + ', recovered=' + auth.recoverd);
			return auth;
		});
	}).then((auth) => {
		var userId = CreateUserID();
		var token = CreateToken(channelId, auth.channelKey, config.appId, userId,
			auth.nonce, auth.timestamp);
		return [auth, userId, token];
	}).then(([auth, userId, token]) => {
		var username = userId + '?appid=' + auth.appId
			+ '&channel=' + auth.channelId + '&nonce=' + auth.nonce
			+ '&timestamp=' + auth.timestamp;

		var duration = parseInt(new Date().getTime() - starttime.getTime());
		console.log('Sign cost=' + duration + 'ms, user=' + userId + ', token=' + token
			+ ', channelKey=' + auth.channelKey);

		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({
			code: 0,
			data: {
				appid: auth.appId,
				userid: userId,
				gslb: [config.gslb],
				token: token,
				nonce: auth.nonce,
				timestamp: auth.timestamp,
				turn: {
					username: username,
					password: token
				}
			}
		}));
	}).catch((err) => {
		console.error(err);
		res.writeHead(500);
		res.end(JSON.stringify(err));
	});
});

server.listen(config.listen);

const sha256 = require('sha256/lib/sha256');

function CreateUserID() {
	return uuidv4();
}

function CreateToken(channelId, channelKey,
	appId, userId, nonce, timestamp
) {
	var token = sha256(channelId + channelKey
		+ appId + userId + nonce + timestamp);
	return token;
}

function RecoverForError(err,
	resolve, reject, appId, channelId
) {
	// Fatal errors, we couldn't recover.
	var fatal = false;
	if (!err || !err.code) {
		fatal = true;
	} else if (err.code == 'IllegalOperationApp') {
		fatal = true;
	} else if (err.code.indexOf('InvalidAccessKeyId') != -1) {
		fatal = true;
	} else if (err.code == 'SignatureDoesNotMatch') {
		fatal = true;
	}
	if (fatal) {
		reject(err);
		return;
	}

	// Try to recover from OpenAPI error.
	var recoverId = 'RCV-' + uuidv4();
	var recoverResponse = {
		recoverd: true,
		appId: appId,
        channelId: channelId,
        requestId: recoverId,
        nonce: recoverId,
        timestamp: 0,
        channelKey: recoverId
    };
	console.warn('Recover ' + JSON.stringify(recoverResponse)
		+ ' from OpenAPI error, err is ' + JSON.stringify(err));
	resolve(recoverResponse);
}

var RTCClient = require('@alicloud/rtc-2018-01-11/lib/client');
function CreateChannel(appId, channelId,
	accessKeyId, accessKeySecret, endpoint
) {
	return new Promise((resolve, reject) => {
		var rtc = new RTCClient({
			accessKeyId: accessKeyId,
			accessKeySecret: accessKeySecret,
			endpoint: endpoint
		});

		rtc.createChannel({
			AppId: appId, ChannelId: channelId
		}).then((res) => {
			resolve({
				recoverd: false,
				appId: appId,
				channelId: channelId,
				requestId: res.RequestId,
				nonce: res.Nonce,
				timestamp: res.Timestamp,
				channelKey: res.ChannelKey
			});
		}).catch((err) => {
			RecoverForError(err,
				resolve, reject, appId, channelId);
		});
	});
}