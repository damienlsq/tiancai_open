// 阿里云SLB接口，用于设置服务器权重，实现动态资源控制

const RPCClient = require('@alicloud/pop-core').RPCClient;

const clientList = {};
function initClient(key) {
  let endpoint;
  let apiVersion;
  switch (key) {
    case 'slb':
      endpoint = 'https://slb.aliyuncs.com/';
      apiVersion = '2014-05-15';
      break;
    case 'ecs':
    default:
      endpoint = 'https://ecs.aliyuncs.com/';
      apiVersion = '2014-05-26';
      break;
  }
  if (!clientList[key]) {
    clientList[key] = new RPCClient({
      accessKeyId: mbgGame.aliyunConfig.accessKeyId,
      secretAccessKey: mbgGame.aliyunConfig.accessKeySecret,
      endpoint,
      apiVersion,
    });
  }

  return clientList[key];
}

module.exports = {
  // ecs接口
  // 根据内网IP获取ECS的实例id
  * queryECSInstanceId(innerIp) {
    const client = initClient('ecs');
    let RegionId = 'cn-shenzhen';
    const res = yield client.request('DescribeInstances', {
      RegionId,
      PageSize: 100,
    });

    if (!res) {
      return null;
    }

    let instanceData;
    if (res.Instances) {
      res.Instances.Instance.forEach((x) => {
        if (x.InnerIpAddress) {
          const ips = x.InnerIpAddress.IpAddress;
          if (ips.indexOf(innerIp) !== -1) {
            instanceData = x;
          }
        }
        if (x.VpcAttributes && x.VpcAttributes.PrivateIpAddress && x.VpcAttributes.PrivateIpAddress.IpAddress) {
          const ips = x.VpcAttributes.PrivateIpAddress.IpAddress;
          if (ips.indexOf(innerIp) !== -1) {
            instanceData = x;
          }
        }
      });
    }
    // mbgGame.logger.info('[queryECSInstanceId]', innerIp, JSON.stringify(res.Instances.Instance), instanceData);
    return instanceData;
  },


  // slb接口
  // 查询ECS权重，-1 未添加
  * getBackendServerWeight(LoadBalancerId, ServerId) {
    const client = initClient('slb');
    const res = yield client.request('DescribeLoadBalancerAttribute', {
      LoadBalancerId,
    });

    let Weight = -1;
    if (!res) {
      return Weight;
    }
    if (res.BackendServers) {
      res.BackendServers.BackendServer.forEach((x) => {
        if (x.ServerId === ServerId) {
          Weight = x.Weight;
        }
      });
    }
    mbgGame.logger.info('[getBackendServerWeight]', ServerId, Weight);
    return Weight;
  },
  // 设置权重
  * setBackendServers(LoadBalancerId, ServerId, Weight) {
    const client = initClient('slb');
    const res = yield client.request('SetBackendServers', {
      LoadBalancerId,
      BackendServers: JSON.stringify([{
        ServerId,
        Weight,
      }]),
    });
    mbgGame.logger.info('[setBackendServers]', ServerId, Weight, res);
  },
};