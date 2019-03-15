# AppServer

Java AppServer for RTC.

## Usage

1. Generate AK from [here](https://usercenter.console.aliyun.com/#/manage/ak):

```
AccessKeyID: xxxxxxxxxxxxxxxx
AccessKeySecret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Create APP from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: iwo5l81k
```

3. Build project with maven, for example, [JetBrains IDEA](https://www.jetbrains.com/idea/download/#section=mac).

4. Run project with args(replace access key and appid with yours):

```
--listen=8080 --access-key-id=xxxxxxxxxxxxxxxx
	--access-key-secret=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --appid=iwo5l81k
	--gslb=https://rgslb.rtc.aliyuncs.com
```

5. Verify  your AppServer by [here](http://ossrs.net/talks/ng_index.html#/rtc-check?schema=http&host=127.0.0.1&port=8080&path=/app/v1/login&room=1237&user=jzufp&password=12345678) or [verify token](http://ossrs.net/talks/ng_index.html#/token-check).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

![AppServer Error Recovered](images/app-recovered.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.
