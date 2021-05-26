核心内容备忘：

1.发送函数
function sendCmd(dHeader, cmd, dData) {
    ···
    dData._cmd = cmd;
    sock.websock.netSendJson(dHeader.sockID, dHeader.connectID, dData);
}

dHeader是用来存放网络通信必然会有的socket信息，而在这套服务器系统中，socket信息是指：
	socketID socket对象的唯一ID
	connectID 连接ID，有这个东西是因为一个socket对象可以和多个远端socket对象建立连接（1对n）

而实际应用发现，dHeader可以用来存放更多的“元”信息，这个元信息是指客户端&服务端框架自身需要的其他沟通信息。实际上，把元信息放进一个dHeader是很简单的事情：dHeader.meta = meta。

cmd是协议名(或称命令)。

dData是用户数据。

sock.websock.netSendJson是底层的websocket的发包函数，交给发包函数的东西必然是一个整体（否则就变成多次发送了）

把dHeader、cmd、dData变成一个整体的方法，就是把dHeader、cmd偷偷放进dData，然后就只需要把dData发过去就可以了。
所以，在网络中传输的数据包对象是这样子的：
{
	_cmd:"", 	//系统自动添加的cmd
	key:value,	//用户自己的k-v对（多个）
}

这个数据包对象，可以序列化成json，也可以序列化成紧凑的2进制包，也即protobuf。

2.meta对象

在不同的情况下，meta是不一样的。
a) C->FS->GS时，要把C和FS的connectID也发给GS
    dHeader.meta = {
        "cid": dHeader.connectID //C和FS之间的cid
    };


删除了一些充值相关的接口代码
服务端和前端连接已经弃用了forwarder的ENet连接，改为用wss连接，因为forwarder已经放弃维护，编译太麻烦，
导致不能升级nodejs，只能使用15版本跑
可以彻底放弃使用，改用ws连接就好了