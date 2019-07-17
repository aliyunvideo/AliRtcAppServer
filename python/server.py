#!/usr/bin/python
# -*- coding: UTF-8 -*-

import sys, os, cherrypy, json, uuid, hashlib, time, datetime
from optparse import OptionParser

parser = OptionParser()
parser.add_option("-a", "--listen", dest="listen", help="Listen port")
parser.add_option("-d", "--appid", dest="appID", help="ID of app")
parser.add_option("-k", "--appkey", dest="appKey", help="Key of app")
parser.add_option("-e", "--gslb", dest="gslb", help="URL of GSLB")

(options, args) = parser.parse_args()
(listen, app_id, app_key, gslb) = (options.listen, options.appID, options.appKey, options.gslb)

if None in (listen, app_id, app_key, gslb):
    print "Usage: %s <--listen=Listen> <--appid=AppID> <--appkey=AppKey> <--gslb=GSLB>"%(sys.argv[0])
    print "     --listen              Server listen port"
    print "     --appid               ID of app"
    print "     --appkey              Key of app"
    print "     --gslb                URL of GSLB"
    print "For example:"
    print "     %s --listen=8080 --appid=iwo5l81k --appkey=9af82119dea1a774334bd89c9bd93631 --gslb=https://rgslb.rtc.aliyuncs.com"%(sys.argv[0])
    sys.exit(-1)

print "Listen=%s, AppID=%s, AppKey=%s, GSLB=%s"%(listen, app_id, app_key, gslb)

conf = {
    'global': {
        'server.socket_host': '0.0.0.0',
        'server.socket_port': int(listen)
    },
    '/': {
        'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
    }
}

def create_user_id(channel_id, user):
    h = hashlib.sha256()
    h.update(channel_id)
    h.update('/')
    h.update(user)
    uid = h.hexdigest()
    return str(uid[0:16])

def create_token(app_id, app_key, channel_id, user_id, nonce, timestamp):
    h = hashlib.sha256()
    h.update(app_id)
    h.update(app_key)
    h.update(channel_id)
    h.update(user_id)
    h.update(nonce)
    h.update(str(timestamp))
    token = h.hexdigest()
    return token

class RESTLogin(object):
    exposed = True
    def __login(self, channel_id, user, passwd, tokensid):
        # generate user id
        user_id = create_user_id(channel_id, user)

        # Warning: nonce support the AppKey generated token.
        # the Nonce should be prefix with 'AK-' otherwise the joining verification will failed.
        # eg. nonce: "AK-0464002093ce3dd010cb05356c8b1d0f".
        nonce =  "AK-%s"%str(uuid.uuid4())

        # Warning: timestamp is the token expiration time.
        # User can custom defined the expire time of token.
        # eg, Expires in two days. timestamp: 1559890860.
        expire = datetime.datetime.now()+datetime.timedelta(days=2)
        timestamp = time.mktime(expire.timetuple())

        # generate token
        token = create_token(app_id, app_key, channel_id, user_id, nonce, timestamp)
        
        username = "%s?appid=%s&channel=%s&nonce=%s&timestamp=%d"%(
            user_id, app_id, channel_id, nonce, timestamp
        )

        print "Login: appID=%s, appKey=%s, channelID=%s, userID=%s, nonce=%s, timestamp=%d, user=%s, userName=%s, token=%s"%(
               app_id, app_key, channel_id, user_id, nonce, timestamp, user, username, token
        )

        ret = json.dumps({"code":0, "data":{
            "appid": app_id, "userid":user_id, "gslb":[gslb],
            "token": token, "nonce": nonce, "timestamp": timestamp,
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
    def GET(self, room, user, passwd, tokensid=None):
        self.allow_cros()
        return self.__login(room, user, passwd, tokensid)
    def POST(self, room, user, passwd, tokensid=None):
        self.allow_cros()
        return self.__login(room, user, passwd, tokensid)
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
