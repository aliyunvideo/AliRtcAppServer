#!/usr/bin/python
# -*- coding: UTF-8 -*-

from aliyunsdkcore.client import AcsClient
from aliyunsdkrtc.request.v20180111 import CreateChannelRequest
from aliyunsdkcore.acs_exception.exceptions import ServerException
import aliyunsdkcore.profile.region_provider as rtc_user_config
import aliyunsdkcore.request as rtc_request
import aliyunsdkcore.http.protocol_type as rtc_protocol_type

import sys, os, cherrypy, json, uuid, hashlib, time
from optparse import OptionParser

parser = OptionParser()
parser.add_option("-a", "--listen", dest="listen", help="Listen port")
parser.add_option("-b", "--access-key-id", dest="accessKeyID", help="ID of access key")
parser.add_option("-c", "--access-key-secret", dest="accessKeySecret", help="Secret of access key")
parser.add_option("-d", "--appid", dest="appID", help="ID of app")
parser.add_option("-e", "--gslb", dest="gslb", help="URL of GSLB")

(options, args) = parser.parse_args()
(listen, accessKeyID, accessKeySecret, app_id, gslb) = (options.listen, options.accessKeyID, options.accessKeySecret, options.appID, options.gslb)

if None in (listen, accessKeyID, accessKeySecret, app_id, gslb):
    print "Usage: %s <--listen=Listen> <--access-key-id=AccessKeyID> <--access-key-secret=AccessKeySecret> <--appid=AppID> <--gslb=GSLB>"%(sys.argv[0])
    print "     --listen              Server listen port"
    print "     --access-key-id       ID of access key"
    print "     --access-key-secret   Secret of access key"
    print "     --appid               ID of app"
    print "     --gslb                URL of GSLB"
    print "For example:"
    print "     %s --listen=8080 --access-key-id=xxxxxxxxxxxxxxxx --access-key-secret=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --appid=iwo5l81k --gslb=https://rgslb.rtc.aliyuncs.com"%(sys.argv[0])
    sys.exit(-1)

regionID = "cn-hangzhou"
endpoint = "rtc.aliyuncs.com"
print "Listen=%s, AccessKeyID=%s, AccessKeySecret=%s, RegionID=%s, AppID=%s, GSLB=%s, endpoint=%s"%(
    listen, accessKeyID, accessKeySecret, regionID, app_id, gslb, endpoint)

conf = {
    'global': {
        'server.socket_host': '0.0.0.0',
        'server.socket_port': int(listen)
    },
    '/': {
        'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
    }
}

channels = {}

class ChannelAuth:
    def __init__(self):
        self.app_id = None
        self.channel_id = None
        self.nonce = None
        self.timestamp = None
        self.channel_key = None
        self.recovered = None
        self.request_id = None

def recover_for_error(ex, app_id, channel_id):
    fatal = False
    request_id = ""

    if isinstance(ex, ServerException):
        request_id = ex.get_request_id()
        code = ex.get_error_code()
        if code == "IllegalOperationApp":
            fatal = True
        elif code.startswith("InvalidAccessKeyId"):
            fatal = True
        elif code == "SignatureDoesNotMatch":
            fatal = True

    if fatal:
        raise ex

    recovered = "RCV-%s"%str(uuid.uuid4())
    print "Recover from %s, recovered=%s"%(ex, recovered)

    auth = ChannelAuth()
    auth.app_id = app_id
    auth.channel_id = channel_id
    auth.nonce = recovered
    auth.timestamp = 0
    auth.channel_key = recovered
    auth.request_id = request_id
    auth.recovered = True
    return auth

def create_channel(app_id, channel_id,
    access_key_id, access_key_secret, region_id, endpoint
):
    try:
        client = AcsClient(access_key_id, access_key_secret, region_id)
        request = CreateChannelRequest.CreateChannelRequest()
        request.set_AppId(app_id)
        request.set_ChannelId(channel_id)

        # Use HTTP, x3 times faster than HTTPS.
        rtc_request.set_default_protocol_type(rtc_protocol_type.HTTP)

        response = client.do_action_with_exception(request)
        obj = json.loads(response)

        auth = ChannelAuth()
        auth.app_id = app_id
        auth.channel_id = channel_id
        auth.nonce = obj['Nonce']
        auth.timestamp = obj['Timestamp']
        auth.channel_key = obj['ChannelKey']
        auth.request_id = obj['RequestId']
        auth.recovered = False
        return auth
    except Exception as ex:
        return recover_for_error(ex, app_id, channel_id)

def create_user_id():
    return str(uuid.uuid4())

def create_token(channel_id, channel_key, app_id, user_id, nonce, timestamp):
    h = hashlib.sha256()
    h.update(channel_id)
    h.update(channel_key)
    h.update(app_id)
    h.update(user_id)
    h.update(nonce)
    h.update(str(timestamp))
    token = h.hexdigest()
    return token

class RESTLogin(object):
    exposed = True
    def __login(self, channel_id, user, passwd):
        starttime = time.time()

        global channels
        channelUrl = "%s/%s"%(app_id, channel_id)
        if channelUrl not in channels:
            auth = create_channel(app_id, channel_id, accessKeyID, accessKeySecret, regionID, endpoint)
            print "CreateChannel requestID=%s, cost=%sms, channelId=%s, nonce=%s, timestamp=%d, channelKey=%s"%(
                auth.request_id, int(1000 * (time.time() - starttime)), auth.channel_id, auth.nonce, auth.timestamp,
                auth.channel_key
            )

            # If recovered from error, we should never cache it,
            # and we should try to request again next time.
            if not auth.recovered:
                channels[channelUrl] = auth
        else:
            auth = channels[channelUrl]

        userid = create_user_id()
        token = create_token(channel_id, auth.channel_key, app_id, userid,
            auth.nonce, auth.timestamp)
        print "Sign cost=%dms, user=%s, userid=%s, token=%s, channel_key=%s"%(
            int(1000 * (time.time() - starttime)), user, userid, token, auth.channel_key
        )

        username = "%s?appid=%s&channel=%s&nonce=%s&timestamp=%d"%(
            userid, app_id, channel_id, auth.nonce, auth.timestamp
        )
        ret = json.dumps({"code":0, "data":{
            "appid": app_id, "userid":userid, "gslb":[gslb],
            "token": token, "nonce": auth.nonce, "timestamp": auth.timestamp,
            "turn": {
                "username": username,
                "password": token
            }
        }})

        cherrypy.response.headers["Content-Type"] = "application/json"
        return ret
    def allow_cros(self):
        if "Origin" in cherrypy.request.headers:
            cherrypy.response.headers["Access-Control-Allow-Origin"] = "*"
            cherrypy.response.headers["Access-Control-Allow-Methods"] = "GET,POST,HEAD,PUT,DELETE,OPTIONS"
            cherrypy.response.headers["Access-Control-Expose-Headers"] = "Server,Range,Content-Length,Content-Range"
            cherrypy.response.headers["Access-Control-Allow-Headers"] = "Origin,Range,Accept-Encoding,Referer,Cache-Control,X-Proxy-Authorization,X-Requested-With,Content-Type"
    def GET(self, room, user, passwd):
        self.allow_cros()
        return self.__login(room, user, passwd)
    def POST(self, room, user, passwd):
        self.allow_cros()
        return self.__login(room, user, passwd)
    def OPTIONS(self, *args, **kwargs):
        self.allow_cros()
        return ""

class Root(object):
    exposed = True
    def GET(self):
        return "AppServer is OK"
class App(object):
    exposed = True
    def GET(self):
        return "AppServer is OK"
class V1(object):
    exposed = True
    def GET(self):
        return "AppServer is OK"

root = Root()
root.app = App()
root.app.v1 = V1()
root.app.v1.login = RESTLogin()
cherrypy.quickstart(root, '/', conf)
