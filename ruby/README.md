# AppServer

Ruby AppServer for RTC.

## Usage

1. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Setup Ruby environment, click [here](https://ruby-china.org/wiki/rvm-guide).

install sinatra gem
```
 gem install sinatra
```


3. Run project with args(replace appid and appkey with yours):

```
ruby server.rb --listen=8080 --appid=xxxxxxxx \
    --appkey=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --gslb=https://rgslb.rtc.aliyuncs.com
```

4. Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.

