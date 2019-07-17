# AppServer

Java AppServer for RTC.

## Usage

1. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Build project with maven, for example, [JetBrains IDEA](https://www.jetbrains.com/idea/download/#section=mac).

3. Run project with args(replace appid and appkey with yours):

```
--listen=8080 --appid=xxxxxxxx --appkey=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
	--gslb=https://rgslb.rtc.aliyuncs.com
```

4. Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.
