<?php

function CreateUserID($channel_id, $user)
{
	$s = $channel_id . '/' . $user;
	$uid = hash('sha256', $s);
	return substr($uid, 0, 16);
}

function CreateToken($app_id, $app_key, $channel_id, $user_id, $nonce, $timestamp)
{
	$s = $app_id . $app_key . $channel_id . $user_id . $nonce . $timestamp;
	$token = hash('sha256', $s);
	return $token;
}

// Allow Cross-Origin Resource Sharing (CORS).
if ($_SERVER['HTTP_ORIGIN'] != '') {
	header("Access-Control-Allow-Origin: *");
	header("Access-Control-Allow-Methods: GET,POST,HEAD,PUT,DELETE,OPTIONS");
	header("Access-Control-Expose-Headers: Server,Range,Content-Length,Content-Range");
	header("Access-Control-Allow-Headers: Origin,Range,Accept-Encoding,Referer,Cache-Control,X-Proxy-Authorization,X-Requested-With,Content-Type");
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	die();
}

header("Content-Type: application/json");

$channel_id = $_REQUEST['room'];
$user = $_REQUEST['user'];

include_once 'Config.php';

$user_id = CreateUserID($channel_id, $user);

// Warning: nonce support the AppKey generated token.
// the Nonce should be prefix with 'AK-' otherwise the joining verification will failed.
// eg. nonce: "AK-0464002093ce3dd010cb05356c8b1d0f".
$nonce = 'AK-' . uniqid();

// Warning: timestamp is the token expiration time.
// User can custom defined the expire time of token.
// eg, Expires in two days. timestamp: 1559890860.
$timestamp = strtotime(date('Y-m-d H:i:s', strtotime('+2day')));

$token = CreateToken($app_id, $app_key, $channel_id, $user_id, $nonce, $timestamp);

$username = $user_id . '?appid=' . $app_id . '&channel=' . $channel_id . '&nonce=' . $nonce . '&timestamp=' . $timestamp;

// By default, write log to /var/log/apache2/error_log
error_log('Login: appID=' . $app_id . ', appKey=' . $app_key . ', channelID='
		. $channel_id . ', userID=' . $user_id . ', nonce=' . $nonce . ', timestamp='
		. $timestamp . ', user=' . $user . ', userName=' . $username . ', token=' . $token);

echo json_encode(array(
	'code' => 0,
	'data' => array(
		'appid' => $app_id,
		'userid' => $user_id,
		'gslb' => array($gslb),
		'token' => $token,
		'nonce' => $nonce,
		'timestamp' => $timestamp,
		'turn' => array(
			'username' => $username,
			'password' => $token
		)
	)
));
?>
