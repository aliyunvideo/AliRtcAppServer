var config = require('./config');
console.log('Server listen=' + config.listen + ', appid=' + config.appId
	+ ', appkey=' + config.appKey + ', gslb=' + config.gslb);

const http = require('http');

const url = require('url');
const query = require('querystring');
const uuidv4 = require('uuid/v4');

const sha256 = require('sha256/lib/sha256');

function CreateUserID(channelId, user) {
	var uid = sha256(channelId + '/' + user);
	return uid.substr(0, 16);
}

function CreateToken(
	appId, appKey, channelId, userId, nonce, timestamp
) {
	var token = sha256(appId + appKey + channelId + userId + nonce + timestamp);
	return token;
}

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
	console.log('Request channelId=' + channelId + ', user=' + user + ', appid=' + config.appId);

	if (channelId == "" || user == "") {
		res.writeHead(500);
		res.end(JSON.stringify("invalid parameter"));
	}

	var userId = CreateUserID(channelId, user);

	// Warning: nonce support the AppKey generated token.
	// the Nonce should be prefix with 'AK-' otherwise the joining verification will failed.
	// eg. nonce: "AK-0464002093ce3dd010cb05356c8b1d0f".
	var nonce = 'AK-' + uuidv4();

	// Warning: timestamp is the token expiration time.
	// User can custom defined the expire time of token.
	// eg, Expires in two days. timestamp: 1559890860.
	var timestamp = parseInt(new Date().getTime()/1000 + 48*60*60);

	var token = CreateToken(config.appId, config.appKey, channelId, userId, nonce, timestamp);

	var username = userId + '?appid=' + config.appId
		+ '&channel=' + channelId + '&nonce=' + nonce
		+ '&timestamp=' + timestamp;

	console.log('Login: appID=' + config.appId + ', appKey=' + config.appKey + ', channelID='
		+ channelId + ', userID=' + userId + ', nonce=' + nonce + ', timestamp='
		+ timestamp + ', user=' + user + ', userName=' + username + ', token=' + token)

	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({
		code: 0,
		data: {
			appid: config.appId,
			userid: userId,
			gslb: [config.gslb],
			token: token,
			nonce: nonce,
			timestamp: timestamp,
			turn: {
				username: username,
				password: token
			}
		}
	}));
});

server.listen(config.listen);


