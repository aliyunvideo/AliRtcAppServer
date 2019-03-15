package main

import (
	"bytes"
	cr "crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	rtcEndpoints "github.com/aliyun/alibaba-cloud-sdk-go/sdk/endpoints"
	rtcErrors "github.com/aliyun/alibaba-cloud-sdk-go/sdk/errors"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/rtc"
	oh "github.com/ossrs/go-oryx-lib/http"
	ol "github.com/ossrs/go-oryx-lib/logger"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type ChannelAuth struct {
	AppID      string
	ChannelID  string
	Nonce      string
	Timestamp  int64
	ChannelKey string
	Recovered  bool
	RequestID  string
}

func RecoverForError(err error, appID, channelID string) (*ChannelAuth, error) {
	var fatal bool
	if err, ok := err.(rtcErrors.Error); ok {
		switch {
		case err.ErrorCode() == "IllegalOperationApp":
			fatal = true
		case strings.HasPrefix(err.ErrorCode(), "InvalidAccessKeyId"):
			fatal = true
		case err.ErrorCode() == "SignatureDoesNotMatch":
			fatal = true
		}
	}

	if fatal {
		return nil, err
	}

	var requestID string
	if err, ok := err.(*rtcErrors.ServerError); ok {
		requestID = err.RequestId()
	}

	var recovered = fmt.Sprintf("RCV-%v", BuildRandom(32))
	fmt.Fprintln(os.Stderr, fmt.Sprintf("Recover from %+v, recovered=%v", err, recovered))
	return &ChannelAuth{
		AppID:      appID,
		ChannelID:  channelID,
		Nonce:      recovered,
		Timestamp:  int64(0),
		ChannelKey: recovered,
		Recovered:  true,
		RequestID:  requestID,
	}, nil
}

func CreateChannel(
	appID, channelID, regionID, endpoint, accessKeyID, accessKeySecret string,
) (*ChannelAuth, error) {
	client, err := rtc.NewClientWithAccessKey(regionID, accessKeyID, accessKeySecret)
	if err != nil {
		return RecoverForError(err, appID, channelID)
	}

	client.EnableAsync(5, 10)

	r := rtc.CreateCreateChannelRequest()
	r.AppId = appID
	r.ChannelId = channelID

	// Strongly recomment to set the RTC endpoint,
	// because the exception is not the "right" one if not set.
	// For example, if access-key-id is invalid:
	//      1. if endpoint is set, exception is InvalidAccessKeyId.NotFound
	//      2. if endpoint isn't set, exception is SDK.InvalidRegionId
	// that's caused by query endpoint failed.
	// @remark SDk will cache endpoints, however it will query endpoint for the first
	//      time, so it's good for performance to set the endpoint.
	rtcEndpoints.AddEndpointMapping(regionID, r.GetProduct(), endpoint)

	// Use HTTP, x3 times faster than HTTPS.
	r.SetScheme("http")

	rrs, errs := client.CreateChannelWithChan(r)
	select {
	case err := <-errs:
		return RecoverForError(err, appID, channelID)
	case r0 := <-rrs:
		return &ChannelAuth{
			AppID:      appID,
			ChannelID:  channelID,
			Nonce:      r0.Nonce,
			Timestamp:  int64(r0.Timestamp),
			ChannelKey: r0.ChannelKey,
			Recovered:  false,
			RequestID:  r0.RequestId,
		}, nil
	}
}

func CreateUserID() string {
	return BuildRandom(32)
}

func CreateToken(
	channelID, channelKey, appID, userID, nonce string, timestamp int64,
) (token string, err error) {
	var b bytes.Buffer
	b.WriteString(channelID)
	b.WriteString(channelKey)
	b.WriteString(appID)
	b.WriteString(userID)
	b.WriteString(nonce)
	b.WriteString(fmt.Sprint(timestamp))

	h := sha256.New()
	if _, err = h.Write([]byte(b.String())); err != nil {
		return "", err
	}

	s := h.Sum(nil)
	token = hex.EncodeToString(s)
	return
}

// generate a random string
func BuildRandom(length int) string {
	if length <= 0 {
		return ""
	}

	b := make([]byte, length/2+1)
	_, _ = cr.Read(b)
	s := hex.EncodeToString(b)
	return s[:length]
}

func main() {
	flag.Usage = func() {
		fmt.Println(fmt.Sprintf("Usage: %v <options>", os.Args[0]))
		fmt.Println(fmt.Sprintf("	--appid			the id of app"))
		fmt.Println(fmt.Sprintf("	--listen		listen port"))
		fmt.Println(fmt.Sprintf("	--access-key-id		the id of access key"))
		fmt.Println(fmt.Sprintf("	--access-key-secret	the secret of access key"))
		fmt.Println(fmt.Sprintf("	--gslb			the gslb url"))
		fmt.Println(fmt.Sprintf("Example:"))
		fmt.Println(fmt.Sprintf("	%v --listen=8080 --access-key-id=xxxxxxxxxxxxxxxx --access-key-secret=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --appid=iwo5l81k --gslb=https://rgslb.rtc.aliyuncs.com", os.Args[0]))
	}

	var appID, listen, accessKeyID, accessKeySecret, gslb string
	flag.StringVar(&appID, "appid", "", "app id")
	flag.StringVar(&listen, "listen", "", "listen port")
	flag.StringVar(&accessKeyID, "access-key-id", "", "access key id")
	flag.StringVar(&accessKeySecret, "access-key-secret", "", "access key secret")
	flag.StringVar(&gslb, "gslb", "", "gslb url")
	regionID, endpoint := "cn-hangzhou", "rtc.aliyuncs.com"

	flag.Parse()
	if appID == "" || listen == "" || accessKeyID == "" || accessKeySecret == "" || gslb == "" {
		flag.Usage()
		os.Exit(-1)
	}

	ol.Tf(nil, "Server listen=%v, appid=%v, akId=%v, akSecret=%v, gslb=%v, region=%v, domain=%v",
		listen, appID, accessKeyID, accessKeySecret, gslb, regionID, endpoint)

	channels := make(map[string]*ChannelAuth)
	var lock sync.Mutex

	pattern := "/app/v1/login"
	ol.Tf(nil, "Handle %v", pattern)
	http.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers.
		if o := r.Header.Get("Origin"); o != "" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,HEAD,PUT,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Expose-Headers", "Server,Range,Content-Length,Content-Range")
			w.Header().Set("Access-Control-Allow-Headers", "Origin,Range,Accept-Encoding,Referer,Cache-Control,X-Proxy-Authorization,X-Requested-With,Content-Type")
		}

		// For matched OPTIONS, should directly return without response.
		if r.Method == "OPTIONS" {
			return
		}

		q := r.URL.Query()
		channelID, user := q.Get("room"), q.Get("user")
		channelUrl := fmt.Sprintf("%v/%v", appID, channelID)
		ol.Tf(nil, "Request channelId=%v, user=%v, appid=%v", channelID, user, appID)

		startime := time.Now()
		var auth *ChannelAuth
		func() {
			lock.Lock()
			defer lock.Unlock()

			var ok bool
			if auth, ok = channels[channelUrl]; ok {
				return
			}

			var err error
			if auth, err = CreateChannel(appID, channelID, regionID, endpoint, accessKeyID, accessKeySecret); err != nil {
				oh.WriteError(nil, w, r, err)
				return
			}

			// If recovered from error, we should never cache it,
			// and we should try to request again next time.
			if !auth.Recovered {
				channels[channelUrl] = auth
			}
			ol.Tf(nil, "CreateChannel requestId=%v, cost=%vms, channelId=%v, nonce=%v, timestamp=%v, channelKey=%v, recovered=%v",
				auth.RequestID, int64(time.Now().Sub(startime)/time.Millisecond), channelID, auth.Nonce, auth.Timestamp, auth.ChannelKey, auth.Recovered)
		}()
		if auth == nil {
			return
		}

		userID := CreateUserID()

		token, err := CreateToken(channelID, auth.ChannelKey, appID, userID,
			auth.Nonce, auth.Timestamp)
		if err != nil {
			oh.WriteError(nil, w, r, err)
			return
		}

		username := fmt.Sprintf("%s?appid=%s&channel=%s&nonce=%s&timestamp=%d",
			userID, appID, channelID, auth.Nonce, auth.Timestamp)
		ol.Tf(nil, "Sign cost=%vms, user=%v, token=%v, channelKey=%v",
			int64(time.Now().Sub(startime)/time.Millisecond), userID, token, auth.ChannelKey)

		type TURN struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		type Response struct {
			AppId     string   `json:"appid"`
			UserId    string   `json:"userid"`
			GSLB      []string `json:"gslb"`
			Token     string   `json:"token"`
			Nonce     string   `json:"nonce"`
			Timestamp int64    `json:"timestamp"`
			TURN      *TURN    `json:"turn"`
		}
		oh.WriteData(nil, w, r, &Response{
			appID, userID, []string{gslb}, token, auth.Nonce, auth.Timestamp,
			&TURN{username, token},
		})
	})

	if err := http.ListenAndServe(fmt.Sprintf(":%v", listen), nil); err != nil {
		panic(err)
	}
}
