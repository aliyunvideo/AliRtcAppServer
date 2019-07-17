package main

import (
	"bytes"
	cr "crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	oh "github.com/ossrs/go-oryx-lib/http"
	ol "github.com/ossrs/go-oryx-lib/logger"
	"github.com/satori/go.uuid"
	"net/http"
	"os"
	"time"
)

func CreateUserID(channelID, user string) string {
	var b bytes.Buffer
	b.WriteString(channelID)
	b.WriteString("/")
	b.WriteString(user)

	h := sha256.New()
	if _, err := h.Write([]byte(b.String())); err != nil {
		return BuildRandom(16)
	}

	s := h.Sum(nil)
	uid := hex.EncodeToString(s)
	return uid[:16]
}

func CreateToken(
	appID, appKey, channelID, userID, nonce string, timestamp int64,
) (token string, err error) {
	var b bytes.Buffer
	b.WriteString(appID)
	b.WriteString(appKey)
	b.WriteString(channelID)
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
		fmt.Println(fmt.Sprintf("	--appkey		the key of app"))
		fmt.Println(fmt.Sprintf("	--listen		listen port"))
		fmt.Println(fmt.Sprintf("	--gslb			the gslb url"))
		fmt.Println(fmt.Sprintf("Example:"))
		fmt.Println(fmt.Sprintf("	%v --listen=8080 --appid=iwo5l81k --appkey=9af82119dea1a774334bd89c9bd93631 --gslb=https://rgslb.rtc.aliyuncs.com", os.Args[0]))
	}

	var appID, appKey, listen, gslb string
	flag.StringVar(&appID, "appid", "", "app id")
	flag.StringVar(&appKey, "appkey", "", "app key")
	flag.StringVar(&listen, "listen", "", "listen port")
	flag.StringVar(&gslb, "gslb", "", "gslb url")

	flag.Parse()
	if appID == "" || appKey == "" || listen == "" || gslb == "" {
		flag.Usage()
		os.Exit(-1)
	}

	ol.Tf(nil, "Server listen=%v, appid=%v, appkey=%v, gslb=%v", listen, appID, appKey, gslb)

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
		ol.Tf(nil, "Request channelId=%v, user=%v, appid=%v", channelID, user, appID)

		if channelID == "" || user == "" {
			oh.WriteError(nil, w, r, errors.New("invalid parameter"))
			return
		}

		userID := CreateUserID(channelID, user)

		// Warning: nonce support the AppKey generated token.
		// the Nonce should be prefix with 'AK-' otherwise the joining verification will failed.
		// eg. nonce: "AK-0464002093ce3dd010cb05356c8b1d0f".

		nonce := fmt.Sprintf("AK-%v", uuid.NewV4())

		// Warning: timestamp is the token expiration time.
		// User can custom defined the expire time of token.
		// eg, Expires in two days. timestamp: 1559890860.
		timestamp := time.Now().Add(48 * time.Hour).Unix()

		token, err := CreateToken(appID, appKey, channelID, userID, nonce, timestamp)
		if err != nil {
			oh.WriteError(nil, w, r, err)
			return
		}
		username := fmt.Sprintf("%s?appid=%s&channel=%s&nonce=%s&timestamp=%d",
			userID, appID, channelID, nonce, timestamp)

		ol.Tf(nil, "Login: appID=%v, appKey=%v, channelID=%v, userID=%v, nonce=%v, "+
			"timestamp=%v, user=%v, userName=%v, token=%v",
			appID, appKey, channelID, userID, nonce, timestamp, user, username, token)

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
			appID, userID, []string{gslb}, token,
			nonce, timestamp,
			&TURN{username, token},
		})
	})

	if err := http.ListenAndServe(fmt.Sprintf(":%v", listen), nil); err != nil {
		panic(err)
	}
}
