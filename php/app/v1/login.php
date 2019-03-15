<?php

include_once 'aliyun-openapi-php-sdk/aliyun-php-sdk-core/Config.php';
Autoloader::addAutoloadPath("aliyun-php-sdk-rtc");
use rtc\Request\V20180111 as RTC;

class ChannelAuth
{
	public $app_id;
	public $channel_id;
	public $nonce;
	public $timestamp;
	public $channel_key;
	public $request_id;
	public $recovered;
}

function RecoverForError($ex, $app_id, $channel_id)
{
	$fatal = False;
	$request_id = '';

	if ($ex instanceof ServerException) {
		$request_id = $ex->getRequestId();
	}

	if ($ex instanceof ClientException) {
		$code = $ex->getErrorCode();
		if ($code === 'IllegalOperationApp') {
			$fatal = True;
		} else if (strpos($code, 'InvalidAccessKeyId') === 0) {
			$fatal = True;
		} else if ($code === 'SignatureDoesNotMatch') {
			$fatal = True;
		}
	}

	if ($fatal) {
		throw $ex;
	}

	$recovered = 'RCV-' . uniqid();
	error_log('Recover from ex ' . $ex . ', recovered=' . $recovered);

	$auth = new ChannelAuth();
	$auth->app_id = $app_id;
	$auth->channel_id = $channel_id;
	$auth->channel_key = $recovered;
	$auth->nonce = $recovered;
	$auth->timestamp = $recovered;
	$auth->request_id = $request_id;
	$auth->recovered = True;
	return $auth;
}

function CreateChannel($app_id, $channel_id,
	$region_id, $endpoint, $access_key_id, $access_key_secret)
{
	try {
		$iClientProfile = DefaultProfile::getProfile(
			$region_id, $access_key_id, $access_key_secret);
		$client = new DefaultAcsClient($iClientProfile);

		$request = new RTC\CreateChannelRequest();
		$request->setAppId($app_id);
		$request->setChannelId($channel_id);

		// Strongly recomment to set the RTC endpoint,
		// because the exception is not the "right" one if not set.
		// For example, if access-key-id is invalid:
		//      1. if endpoint is set, exception is InvalidAccessKeyId.NotFound
		//      2. if endpoint isn't set, exception is SDK.InvalidRegionId
		// that's caused by query endpoint failed.
		// @remark SDk will cache endpoints, however it will query endpoint for the first
		//      time, so it's good for performance to set the endpoint.
		$product = $request->getProduct();
		DefaultProfile::addEndpoint($region_id, $region_id, $product, $endpoint);

		// Use HTTP, x3 times faster than HTTPS.
		$request->setProtocol('http');

		$response = $client->getAcsResponse($request);

		$auth = new ChannelAuth();
		$auth->app_id = $app_id;
		$auth->channel_id = $channel_id;
		$auth->channel_key = $response->ChannelKey;
		$auth->nonce = $response->Nonce;
		$auth->timestamp = $response->Timestamp;
		$auth->request_id = $response->RequestId;
		$auth->recovered = False;
		return $auth;
	} catch (Exception $ex) {
		return RecoverForError($ex, $app_id, $channel_id);
	}
}

function CreateUserID()
{
	return uniqid();
}

function BuildToken($channel_id, $channel_key,
	$app_id, $user_id, $nonce, $timestamp)
{
	$s = $channel_id . $channel_key . $app_id
		. $user_id . $nonce . $timestamp;
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
$password = $_REQUEST['password'];

include_once 'Config.php';
$channel_url = $app_id . '/' . $channel_id;

function ReadObjects()
{
	$file = fopen('db.txt', 'r');
    if (!$file) {
    	die('Open file failed');
    }

    $filesize = filesize('db.txt');
    if ($filesize > 0) {
        $content = fread($file, filesize('db.txt'));
    }
    fclose($file);

    if ($filesize > 0) {
        return json_decode($content);
    }
    return (object)[];
}

function WriteObject($channels)
{
	$file = fopen('db.txt', 'w');
    if (!$file) {
    	die('Open file failed');
    }

	$content = json_encode($channels);
    fwrite($file, $content);

    fclose($file);
}

$starttime = microtime(True);
$channels = ReadObjects();

if (!isset($channels->{$channel_url})) {
	$auth = CreateChannel($app_id, $channel_id, $region_id, $endpoint, $access_key_id, $access_key_secret);

	// If recovered from error, we should never cache it,
	// and we should try to request again next time.
	if (!$auth->recovered) {
		$channels->{$channel_url} = $auth;
		WriteObject($channels);
	}

	// By default, write log to /var/log/apache2/error_log
	$duration = round((microtime(True) - $starttime) * 1000);
	error_log('CreateChannel requestId=' . $auth->request_id . ', cost='. $duration
		. 'ms, channelId=' . $auth->channel_id . ', nonce=' . $auth->nonce . ', timestamp=' . $auth->timestamp
		. ', channelKey=' . $auth->channel_key . ', recovered=' . $auth->recovered);
} else {
	$auth = $channels->{$channel_url};
}

$user_id = CreateUserID();
$token = BuildToken($channel_id, $auth->channel_key, $app_id, $user_id,
	$auth->nonce, $auth->timestamp);
$username = $user_id . '?appid=' . $appid . '&channel=' . $channel_id . '&nonce=' . $nonce . '&timestamp=' . $timestamp;

// By default, write log to /var/log/apache2/error_log
$duration = round((microtime(True) - $starttime) * 1000);
error_log('Sign cost='. $duration . 'ms, user=' . $user . ', userId=' . $user_id
	. ', token=' . $token . ', channelKey=' . $channel_key);

echo json_encode(array(
	'code' => 0,
	'data' => array(
		'appid' => $app_id,
		'userid' => $user_id,
		'gslb' => array($gslb),
		'token' => $token,
		'nonce' => $auth->nonce,
		'timestamp' => $auth->timestamp,
		'turn' => array(
			'username' => $username,
			'password' => $token
		)
	)
));
?>