# AppServer

Python AppServer for AliRTC.

## CentOS6

1. Setup Python:

```
(pip --version 2>/dev/null || sudo yum install -y python-pip) &&
(rm -rf CherryPy-3.2.2 && unzip -q CherryPy-3.2.2.zip && cd CherryPy-3.2.2 && python setup.py install --user)
```

2. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Start AppServer, **use your information**:

```
./server.py --listen=8080 --appid=xxxxxxxx \
	--appkey=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
	--gslb=https://rgslb.rtc.aliyuncs.com
```


4. Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig eth0`.

## MacPro

1. Install `pip` for Python:

```
pip --version 2>/dev/null || sudo easy_install pip
```

or

```
url='https://files.pythonhosted.org/packages/ae/e8/2340d46ecadb1692a1e455f13f75e596d4eab3d11a57446f08259dee8f02/pip-10.0.1.tar.gz#sha256=f2bd08e0cd1b06e10218feaf6fef299f473ba706582eb3bd9d52203fdbd7ee68' &&
pip --version 2>/dev/null || (wget $url -O pip-10.0.1.tar.gz
tar xf pip-10.0.1.tar.gz && cd pip-10.0.1 &&
sudo python setup.py install)
```

2. Setup Python:

```
(rm -rf CherryPy-3.2.2 && unzip -q CherryPy-3.2.2.zip && cd CherryPy-3.2.2 && python setup.py install --user)
```

3. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

4. Start AppServer, **use your information**:

```
./server.py --listen=8080 --appid=xxxxxxxx \
	--appkey=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
	--gslb=https://rgslb.rtc.aliyuncs.com
```

5.Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ifconfig en0`.

## Windows

1. Unzip `CherryPy-3.2.2.zip` then install by:

```
cd CherryPy-3.2.2
python setup.py install --user
```

2. Download `pycryptodome` from [here](https://pypi.org/project/pycryptodome/#files), then unzip and install by:

```
cd pycryptodome-*
python setup.py install --user
```

3. Create APP and APPKey from [here](https://rtc.console.aliyun.com/#/manage):

```
AppID: xxxxxxxx
AppKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

4. Start AppServer, **use your information**:

```
python server.py --listen=8080 --appid=xxxxxxxx \
    --appkey=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
    --gslb=https://rgslb.rtc.aliyuncs.com
```

5. Verify your AppServer by [VerifyServer](../verify/README.md).

![AppServer Success](images/app-ok.png)

![AppServer Failed](images/app-failed.png)

> Remark: You can setup client native SDK by `http://30.2.228.19:8080/app/v1`.

> Remark: Please use your AppServer IP instead by `ipconfig`.
