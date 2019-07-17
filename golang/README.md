# AppServer

Golang AppServer for RTC.

## Usage

1. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Setup Golang environment, click [here](https://blog.csdn.net/win_lin/article/details/48265493).


3. Run project with args(replace appid and appkey with yours):

```
go run main.go --listen=8080 --appid=xxxxxxxx \
    --appkey=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --gslb=https://rgslb.rtc.aliyuncs.com
```

4. Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.

