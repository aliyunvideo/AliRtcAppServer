using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

using Aliyun.Acs.Core;
using Aliyun.Acs.Core.Profile;
using Aliyun.Acs.rtc.Model.V20180111;
using Aliyun.Acs.Core.Exceptions;

using System.Security.Cryptography;

namespace rtc_app_csharp
{
    class ChannelAuth
    {
        public string AppId;
        public string ChannelId;
        public string Nonce;
        public Int64 Timestamp;
        public string ChannelKey;
        public bool Recovered;
        public string RequestId;
    }

    class Program
    {
        static ChannelAuth RecoverForError(Exception ex, string appId, string channelId)
        {
            bool fatal = false;
            string requestId = "";

            ClientException cex = ex as ClientException;
            if (cex != null && cex.ErrorCode != null)
            {
                requestId = cex.RequestId;
                string code = cex.ErrorCode;
                if (code == "IllegalOperationApp")
                {
                    fatal = true;
                }
                else if (code.StartsWith("InvalidAccessKeyId", StringComparison.Ordinal))
                {
                    fatal = true;
                }
                else if (code == "SignatureDoesNotMatch")
                {
                    fatal = true;
                }
            }

            if (fatal)
            {
                throw ex;
            }

            string recovered = "RCV-" + Guid.NewGuid().ToString();
            System.Console.WriteLine("Recover from {0}, recovered={1}", ex.ToString(), recovered);

            ChannelAuth auth = new ChannelAuth();
            auth.AppId = appId;
            auth.ChannelId = channelId;
            auth.Nonce = recovered;
            auth.Timestamp = 0;
            auth.ChannelKey = recovered;
            auth.Recovered = true;

            return auth;
        }

        static ChannelAuth CreateChannel(
            string appId, string channelId,
            string regionId, string endpoint, string accessKeyId,
            string accessKeySecret)
        {
            try
            {
                IClientProfile profile = DefaultProfile.GetProfile(
                    regionId, accessKeyId, accessKeySecret);
                IAcsClient client = new DefaultAcsClient(profile);

                CreateChannelRequest request = new CreateChannelRequest();
                request.AppId = appId;
                request.ChannelId = channelId;

                // Strongly recomment to set the RTC endpoint,
                // because the exception is not the "right" one if not set.
                // For example, if access-key-id is invalid:
                //      1. if endpoint is set, exception is InvalidAccessKeyId.NotFound
                //      2. if endpoint isn't set, exception is SDK.InvalidRegionId
                // that's caused by query endpoint failed.
                // @remark SDk will cache endpoints, however it will query endpoint for the first
                //      time, so it's good for performance to set the endpoint.
                DefaultProfile.AddEndpoint(regionId, regionId, request.Product, endpoint);

                // Use HTTP, x3 times faster than HTTPS.
                request.Protocol = Aliyun.Acs.Core.Http.ProtocolType.HTTP;

                CreateChannelResponse response = client.GetAcsResponse(request);

                ChannelAuth auth = new ChannelAuth();
                auth.AppId = appId;
                auth.ChannelId = channelId;
                auth.Nonce = response.Nonce;
                auth.Timestamp = (Int64)response.Timestamp;
                auth.ChannelKey = response.ChannelKey;
                auth.Recovered = false;
                auth.RequestId = response.RequestId;

                return auth;
            }
            catch (Exception ex)
            {
                return RecoverForError(ex, appId, channelId);
            }
        }

        static string CreateUserId()
        {
            return Guid.NewGuid().ToString();
        }

        static string CreateToken(
            string channelId, string channelKey, string appid, string userId,
            string nonce, Int64 timestamp)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(channelId).Append(channelKey);
            sb.Append(appid).Append(userId);
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

        static Dictionary<string, ChannelAuth> channels = new Dictionary<string, ChannelAuth>();

        static void Main(string[] args)
        {
            string appid = "", listen = "", accessKeyId = "", accessKeySecret = "", gslb = "";
            string regionId = "cn-hangzhou";
            string endpoint = "rtc.aliyuncs.com";

            foreach (string arg in args)
            {
                string key = arg.Split('=')[0], value = arg.Split('=')[1];
                if (key == "--appid")
                {
                    appid = value;
                }
                else if (key == "--listen")
                {
                    listen = value;
                }
                else if (key == "--access-key-id")
                {
                    accessKeyId = value;
                }
                else if (key == "--access-key-secret")
                {
                    accessKeySecret = value;
                }
                else if (key == "--gslb")
                {
                    gslb = value;
                }
            }
            if (appid == "" || listen == "" || accessKeyId == "" || accessKeySecret == "" || gslb == "")
            {
                System.Console.WriteLine("Usage: app.exe <options>");
                System.Console.WriteLine("    --appid             the id of app");
                System.Console.WriteLine("    --listen            listen port");
                System.Console.WriteLine("    --access-key-id     the id of access key");
                System.Console.WriteLine("    --access-key-secret the secret of access key");
                System.Console.WriteLine("    --gslb              the gslb url");
                System.Console.WriteLine("Example:");
                System.Console.WriteLine("    app.exe --listen=8080 --access-key-id=OGAEkdiL62AkwSgs --access-key-secret=4JaIs4SG4dLwPsQSwGAHzeOQKxO6iw --appid=iwo5l81k --gslb=https://rgslb.rtc.aliyuncs.com");
                Environment.Exit(-1);
            }
            System.Console.WriteLine(String.Format(
                "Server listen={0}, appid={1}, akID={2}, akSecret={3}, gslb={4}, regionId={5}, endpoint={6}",
                listen, appid, accessKeyId, accessKeySecret, gslb, regionId, endpoint));

            using (HttpListener listener = new HttpListener())
            {
                listener.Prefixes.Add(String.Format("http://+:{0}/", listen));
                listener.Start();

                while (true)
                {
                    HttpListenerContext context = listener.GetContext();
                    HandleRequest(context, appid, accessKeyId, accessKeySecret, gslb, regionId, endpoint);
                }
            }
        }

        static void HandleRequest(HttpListenerContext context, string appid, string accessKeyId, string accessKeySecret, string gslb, string regionId, string endpoint)
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
            string channelUrl = string.Format("{0}/{1}", appid, channelId);
            System.Console.WriteLine(String.Format("Request channelId={0}, user={1}, appid={2}", channelId, user, appid));

            try
            {
                DateTime starttime = DateTime.Now;

                ChannelAuth auth = null;
                using (Mutex locker = new Mutex())
                {
                    locker.WaitOne();

                    if (channels.ContainsKey(channelUrl))
                    {
                        auth = channels[channelUrl];
                    }
                    else
                    {
                        auth = CreateChannel(appid, channelId, regionId, endpoint, accessKeyId, accessKeySecret);

                        // If recovered from error, we should never cache it,
                        // and we should try to request again next time.
                        if (!auth.Recovered)
                        {
                            channels[channelUrl] = auth;
                        }

                        System.Console.WriteLine(String.Format(
                            "CreateChannel requestId={4}, cost={6}ms, channelId={0}, nonce={1}, timestamp={2}, channelKey={3}, recovered={5}",
                            channelId, auth.Nonce, auth.Timestamp, auth.ChannelKey, auth.RequestId, auth.Recovered, DateTime.Now.Subtract(starttime).Milliseconds));
                    }
                }

                string userId = CreateUserId();
                string token = CreateToken(channelId, auth.ChannelKey, appid, userId,
                    auth.Nonce, auth.Timestamp);
                string username = String.Format(
                    "{0}?appid={1}&channel={2}&nonce={3}&timestamp={4}",
                    userId, appid, channelId, auth.Nonce, auth.Timestamp);
                System.Console.WriteLine("Sign cost={4}ms, user={0}, userId={1}, token={2}, channelKey={3}",
                    user, userId, token, auth.ChannelKey, DateTime.Now.Subtract(starttime).Milliseconds);

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
                rresponse.Add("nonce", auth.Nonce);
                rresponse.Add("timestamp", auth.Timestamp);
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
