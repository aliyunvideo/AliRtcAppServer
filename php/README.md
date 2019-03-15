# AppServer

PHP AppServer for RTC.

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

4. Clone SDK:

```
cd app/v1 &&
git clone https://github.com/aliyun/aliyun-openapi-php-sdk.git
```

5. Create DB file for php:

```
touch db.txt && chmod 777 db.txt
```

6. Create Config.php by your data:

```
echo "<?php" > Config.php
echo "\$listen = 8080;" >> Config.php
echo "\$region_id = 'cn-hangzhou'; " >> Config.php
echo "\$endpoint = 'rtc.aliyuncs.com'; " >> Config.php
echo "\$access_key_id = 'xxxxxxxxxxxxxxxx'; " >> Config.php
echo "\$access_key_secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; " >> Config.php
echo "\$app_id = 'iwo5l81k'; " >> Config.php
echo "\$gslb = 'https://rgslb.rtc.aliyuncs.com'; " >> Config.php
echo "?>" >> Config.php
```

> User can use other DB like MySQL.

7. Verify  your AppServer by [here](http://ossrs.net/talks/ng_index.html#/rtc-check?schema=http&host=127.0.0.1&port=8080&path=/app/v1/login&room=1237&user=jzufp&password=12345678) or [verify token](http://ossrs.net/talks/ng_index.html#/token-check).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

![AppServer Error Recovered](images/app-recovered.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.

