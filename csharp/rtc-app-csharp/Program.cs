using System;
using System.IO;
using System.Net;
using System.Text;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;

namespace rtc_app_csharp
{
    class Program
    {
        static string CreateUserId(string channelId, string user)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(channelId).Append("/").Append(user);

            using (SHA256 hash = SHA256.Create())
            {
                byte[] checksum = hash.ComputeHash(
                    Encoding.ASCII.GetBytes(sb.ToString()));

                string uid = HexEncode(checksum);
                return uid.Substring(0, 16);
            }
        }

        static string CreateToken(
            string appid, string appKey, string channelId, string userId,
            string nonce, Int64 timestamp)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(appid).Append(appKey);
            sb.Append(channelId).Append(userId);
            sb.Append(nonce).Append(timestamp);

            using (SHA256 hash = SHA256.Create())
            {
                byte[] checksum = hash.ComputeHash(
                    Encoding.ASCII.GetBytes(sb.ToString()));

                string token = HexEncode(checksum);
                return token;
            }
        }

        static string HexEncode(byte[] bytes)
        {
            StringBuilder sb = new StringBuilder();
            foreach (byte b in bytes)
            {
                sb.Append(b.ToString("x2"));
            }

            return sb.ToString();
        }

        static void Main(string[] args)
        {
            string appid = "", appkey = "", listen = "", gslb = "";

            foreach (string arg in args)
            {
                string key = arg.Split('=')[0], value = arg.Split('=')[1];
                if (key == "--appid")
                {
                    appid = value;
                }
                else if (key == "--appkey")
                {
                    appkey = value;
                }
                else if (key == "--listen")
                {
                    listen = value;
                }
                else if (key == "--gslb")
                {
                    gslb = value;
                }
            }
            if (appid == "" || appkey == "" || listen == "" || gslb == "")
            {
                System.Console.WriteLine("Usage: app.exe <options>");
                System.Console.WriteLine("    --appid    the id of app");
                System.Console.WriteLine("    --appkey   the key of app");
                System.Console.WriteLine("    --listen   listen port");
                System.Console.WriteLine("    --gslb     the gslb url");
                System.Console.WriteLine("Example:");
                System.Console.WriteLine("    app.exe --listen=8080 --appid=iwo5l81k --appkey=9af82119dea1a774334bd89c9bd93631 --gslb=https://rgslb.rtc.aliyuncs.com");
                Environment.Exit(-1);
            }
            System.Console.WriteLine(String.Format(
                "Server listen={0}, appid={1}, appkey={2}, gslb={3}",
                listen, appid, appkey, gslb));

            using (HttpListener listener = new HttpListener())
            {
                listener.Prefixes.Add(String.Format("http://+:{0}/", listen));
                listener.Start();

                while (true)
                {
                    HttpListenerContext context = listener.GetContext();
                    HandleRequest(context, appid, appkey, gslb);
                }
            }
        }

        static void HandleRequest(HttpListenerContext context, string appid, string appkey, string gslb)
        {
            if (context.Request.Headers.Get("Origin") != "")
            {
                context.Response.Headers.Set("Access-Control-Allow-Origin", "*");
                context.Response.Headers.Set("Access-Control-Allow-Methods", "GET,POST,HEAD,PUT,DELETE,OPTIONS");
                context.Response.Headers.Set("Access-Control-Expose-Headers", "Server,Range,Content-Length,Content-Range");
                context.Response.Headers.Set("Access-Control-Allow-Headers", "Origin,Range,Accept-Encoding,Referer,Cache-Control,X-Proxy-Authorization,X-Requested-With,Content-Type");
            }

            if (context.Request.HttpMethod == "OPTIONS")
            {
                responseWrite(context, HttpStatusCode.OK, "");
                return;
            }

            string url = context.Request.RawUrl;
            System.Console.WriteLine(String.Format("URL={0}", url));
            if (!url.StartsWith("/app/v1/login", StringComparison.Ordinal))
            {
                responseWrite(context, HttpStatusCode.NotFound, String.Format("Invalid url {0}", url));
                return;
            }

            string channelId = context.Request.QueryString.Get("room");
            string user = context.Request.QueryString.Get("user");
            System.Console.WriteLine(String.Format("Request channelId={0}, user={1}, appid={2}", channelId, user, appid));

            if (channelId == "" || user == "")
            {
                responseWrite(context, HttpStatusCode.NotFound, String.Format("Invalid parameter"));
                return;
            }

            try
            {
                string userId = CreateUserId(channelId, user);

                // Warning: nonce support the AppKey generated token.
                // the Nonce should be prefix with 'AK-' otherwise the joining verification will failed.
                // eg. nonce: "AK-0464002093ce3dd010cb05356c8b1d0f".
                string nonce = "AK-" + Guid.NewGuid().ToString();

                // Warning: timestamp is the token expiration time.
                // User can custom defined the expire time of token.
                // eg, Expires in two days. timestamp: 1559890860.
                DateTime dateStart = new DateTime(1970, 1, 1, 8, 0, 0);
                Int64 timestamp = Convert.ToInt64((DateTime.Now.AddHours(48) - dateStart).TotalSeconds);

                string token = CreateToken(appid, appkey, channelId, userId, nonce, timestamp);
                string username = String.Format(
                    "{0}?appid={1}&channel={2}&nonce={3}&timestamp={4}",
                    userId, appid, channelId, nonce, timestamp);

                System.Console.WriteLine("Login: appID={0}, appKey={1}, channelID={2}, userID={3}, " +
                    "nonce={4}, timestamp={5}, user={6}, userName={7}, token={8}",
                    appid, appkey, channelId, userId, nonce, timestamp, user, username, token);

                JObject rturn = new JObject();
                rturn.Add("username", username);
                rturn.Add("password", token);

                JArray rgslbs = new JArray();
                rgslbs.Add(gslb);

                JObject rresponse = new JObject();
                rresponse.Add("appid", appid);
                rresponse.Add("userid", userId);
                rresponse.Add("gslb", rgslbs);
                rresponse.Add("token", token);
                rresponse.Add("nonce", nonce);
                rresponse.Add("timestamp", timestamp);
                rresponse.Add("turn", rturn);

                JObject ro = new JObject();
                ro.Add("code", 0);
                ro.Add("data", rresponse);

                responseWrite(context, HttpStatusCode.OK, ro.ToString());
            }
            catch (Exception ex)
            {
                responseWrite(context, HttpStatusCode.InternalServerError, ex.Message);
                System.Console.WriteLine(ex.ToString());
            }
        }

        static void responseWrite(HttpListenerContext context, HttpStatusCode status, string message)
        {
            context.Response.StatusCode = (int)status;

            context.Response.Headers.Set("Content-Type", "application/json");

            byte[] b = Encoding.UTF8.GetBytes(message);
            using (Stream s = context.Response.OutputStream)
            {
                s.Write(b, 0, b.Length);
            }
        }
    }
}
