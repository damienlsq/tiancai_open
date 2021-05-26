
const defines = require('../logic/w_defines');
const uuid_module = require('uuid');
const co = require('co');

/*
只存一个地图里的房间数据
{
    coord: roomData

    coord = `${x},${y}` 原点(0,0)在地图中心，x、y支持负数
    roomData = {
        t: 房间类型编号
    }
}
*/
const NRooms = mbgGame.common.db_mgr.CHash.extend({
  // tc_map_h_rooms: mapUUID
  FuncType: "",
  SubType: "rooms",
});

/*
  地图的全局信息
*/
const NMap = mbgGame.common.db_mgr.CHash.extend({
  // tc_map_h_info: mapUUID
  FuncType: "map",
  SubType: "info",
});


/*
  和玩家关联的地图列表
  {
    TODO 这个结构不合理
    mapType: mapUUID
  }
*/
const NMapLinks = mbgGame.common.db_mgr.CHash.extend({
  // tc_map_h_link: playerUUID
  FuncType: "map",
  SubType: "link",
});


class MapCtrl {
  generateRoom(roomType) {
    return {
      t: roomType,
    };
  }
  * generateMap(nPlayer, mapType, halfW, halfH) {
    let mapUUID = uuid_module.v4();
    mapUUID = mapUUID.toUpperCase();
    const nRooms = new NRooms(mapUUID);
    const nMap = new NMap(mapUUID);
    yield nMap.hmset({
      t: mapType,
      hW: halfW,
      hH: halfH,
    });
    const dRooms = {};
    for (let x = -halfW; x <= halfW; x++) {
      for (let y = -halfH; y <= halfH; y++) {
        const roomType = 1;
        const dRoom = this.generateRoom(roomType);
        dRooms[`${+x},${+y}`] = dRoom;
      }
    }
    yield nRooms.hmset(dRooms);
    return mapUUID;
  }
  * getLinkedMaps(nPlayer) {
    const nMapLinks = new NMapLinks(nPlayer.getUUID());
    const dLink = yield nMapLinks.loadAsync();
    return dLink;
  }
  * linkMap(nPlayer, mapType, mapUUID) {
    const nMapLinks = new NMapLinks(nPlayer.getUUID());
    yield nMapLinks.hset(mapType, mapUUID);
  }
  * initMap(nPlayer) {
    const dLink = yield this.getLinkedMaps(nPlayer);
    const mapType = 1;
    if (!dLink[mapType]) {
      const mapUUID = yield this.generateMap(nPlayer, mapType, 3, 3);
      dLink[mapType] = mapUUID;
      yield this.linkMap(nPlayer, mapType, mapUUID);
    }
    return dLink;
  }
  * removeMap(mapUUID) {
    const nMap = new NMap(mapUUID);
    yield nMap.del();
  }
  // debug use
  * removeAllMap(nPlayer) {
    const dLink = yield this.getLinkedMaps(nPlayer);
    const nRooms = new NRooms();
    const nMap = new NMap();
    for (const mapType in dLink) {
      const mapUUID = dLink[mapType];
      nRooms.setName(mapUUID);
      nMap.setName(mapUUID);
      yield nMap.del();
      yield nMap.del();
    }
    const nMapLinks = new NMapLinks(nPlayer.getUUID());
    yield nMapLinks.del();
  }

  /*
  coords 需要获取的房间列表
  [
     [x, y]
     [xStart, xLen, yStart, yLen]
  ]
  */
  * getRoomsData(mapUUID, coords) {
    if (!mapUUID) {
      return {};
    }
    const nRooms = new NRooms(mapUUID);
    let dRoomsData;
    if (!coords) {
      dRoomsData = yield nRooms.loadAsync();
    } else {
      const lst = [];
      for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];
        if (coord.length === 2) {
          lst.push(`${+coord[0]},${+coord[1]}`);
        } else if (coord.length === 4) {
          const [xStart, xLen, yStart, yLen] = coord;
          const xEnd = xStart + xLen;
          const yEnd = yStart + yLen;
          for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
              lst.push(`${+x},${+y}`);
            }
          }
        }
      }
      const dataList = yield nRooms.hmget(lst);
      for (let i = 0; i < lst.length; i++) {
        const sCoord = lst[i];
        if (dataList[i]) {
          dRoomsData[sCoord] = JSON.parse(dataList[i]);
        }
      }
    }
    return dRoomsData;
  }

}

module.exports = MapCtrl;