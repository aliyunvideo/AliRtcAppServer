# AppServer

Nodejs AppServer for RTC.


## Usage

1. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Clone project and generate config:

```
npm install &&
echo "module.exports = {" > config.js &&
echo "  listen: 8080," >> config.js &&
echo "  appId: 'xxxxxxxx'," >> config.js &&
echo "  appKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'," >> config.js &&
echo "  gslb: 'https://rgslb.rtc.aliyuncs.com'" >> config.js &&
echo "};" >> config.js &&
node index.js
```

3. Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.

