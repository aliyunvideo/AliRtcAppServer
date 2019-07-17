# AppServer Token Verify

AppServer Token Verify for AliRTC.

## CentOS6

1. Setup Python:

```
(pip --version 2>/dev/null || sudo yum install -y python-pip) &&
(rm -rf CherryPy-3.2.2 && unzip -q CherryPy-3.2.2.zip && cd CherryPy-3.2.2 && python setup.py install --user)
```

2. Start AppServer Verify Server:

```
./server.py --listen=9000
```

3. Verify your AppServer by [here](http://127.0.0.1:9000/ng_index.html#/rtc-check?schema=http&host=127.0.0.1&port=8080&path=/app/v1/login&room=1237&user=jzufp&password=12345678).

4. Verify your Token by [verify token](http://127.0.0.1:9000/ng_index.html#/token-check).


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

3. Start AppServer Verify Server:

```
./server.py --listen=9000
```

4. Verify your AppServer by [here](http://127.0.0.1:9000/ng_index.html#/rtc-check?schema=http&host=127.0.0.1&port=8080&path=/app/v1/login&room=1237&user=jzufp&password=12345678).

5. Verify your Token by [verify token](http://127.0.0.1:9000/ng_index.html#/token-check).


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

3. Start AppServer Verify Server:

```
./server.py --listen=9000
```

4. Verify your AppServer by [here](http://127.0.0.1:9000/ng_index.html#/rtc-check?schema=http&host=127.0.0.1&port=8080&path=/app/v1/login&room=1237&user=jzufp&password=12345678).

5. Verify your Token by [verify token](http://127.0.0.1:9000/ng_index.html#/token-check).

