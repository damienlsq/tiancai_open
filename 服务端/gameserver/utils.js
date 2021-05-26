
const UInt8ArrayToBase64 = function(int8Array) {
  // check是否有null值，有的话设0
  for (let i = 0, len = int8Array.length; i < len; i++) {
    if (int8Array[i] == null) {
      int8Array[i] = 0;
    }
  }
  const base64Str = (new Buffer(int8Array)).toString('base64');
  return base64Str;
};

const Base64ToUInt8Array = function(base64Str) {
  const int8Array = Array.from(new Uint8Array(Buffer.from(base64Str, 'base64')));
  return int8Array;
};


const getBitInArray = function(arr, bitPos) {
  const bytes_offset = Math.floor(bitPos / 8); // 25 / 8 = 3
  const b = arr[bytes_offset]; // [0, 1, 2, <3>]
  const bits_offset_inner = bitPos % 8; // 25 % 8 = 1
  return (b >> bits_offset_inner) & 0x1; // 偏移后取第一位
};

const setBitInArray = function(arr, bitPos, val) {
  if (!_.isNumber(val) || val < 0) {
    return;
  }
  if (val > 1) {
    val = 1;
  }
  // val must be 0 or 1
  const bytes_offset = Math.floor(bitPos / 8); // 25 / 8 = 3
  let b = arr[bytes_offset] || 0; // [0, 1, 2, <3>]
  const bits_offset_inner = bitPos % 8; // 25 % 8 = 1
  b |= (val << bits_offset_inner); // 偏移后取第一位
  arr[bytes_offset] = b;
};

const setBitsValInArray = function(arr, startPos, bitsNum, val) {
  for (let i = 0; i < bitsNum; i++) {
    setBitInArray(arr, startPos + i, (val >> i) & 0x01);
  }
};

const getBitsValInArray = function(arr, startPos, bitsNum) {
  let val = 0;
  let bitVal;
  for (let i = 0; i < bitsNum; i++) {
    bitVal = getBitInArray(arr, startPos + i);
    val |= (bitVal << i);
  }
  return val;
};

function array2dict(array, dictVal) {
  if (!_.isNumber(dictVal)) {
    dictVal = 1;
  }
  const result = _.mapObject(_.object(array, []), (val, key) => {
    return dictVal;
  });
  return result;
}

function removeArrayElem(arr, v) {
  const idx = arr.indexOf(v);
  if (idx !== -1) {
    arr.splice(idx, 1);
  }
}

function get_ip(isPublic = true) {
  const intervalIPS = [
    '192.168.',
    '172.16.',
    '172.17.',
    '172.18.',
    '172.19.',
    '172.20.',
    '172.21.',
    '172.22.',
    '172.23.',
    '172.24.',
    '172.25.',
    '172.26.',
    '172.27.',
    '172.28.',
    '172.29.',
    '172.30.',
    '172.31.',
    '10.',
  ];
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let innerIP = '';
  let publicIP = '';
  for (const k in networkInterfaces) {
    if (k.startsWith('eth')) {
      const ip = networkInterfaces[k][0].address;
      const parts = ip.split('.');

      if (parts[0] === '10') {
        innerIP = ip;
      } else {
        const twoParts = `${parts[0]}.${parts[1]}.`;
        if (intervalIPS.indexOf(twoParts) === -1) {
          publicIP = ip;
          if (isPublic) {
            break;
          }
        }
      }
    }
  }
  return isPublic ? publicIP || innerIP : innerIP;
}

function pad(n, width, z) {
  z = z || '0';
  n = `${n}`;
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function deepClone(obj) {
  if (obj == null || typeof (obj) !== 'object') {
    return obj;
  }

  const temp = new obj.constructor();

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      temp[key] = deepClone(obj[key]);
    }
  }
  return temp;
}


// 0-9a-zA-Z = 62个字符
// 0-9还是表示 0 -> 9
// a-z表示 10 -> 35
// A-Z表示 36 -> 61
// 5个字符(40字节）就可以表示62**5 = 916132832 ，9亿个数字

// 快速转换ascii码
const base62int = {};
const int2base62 = {};
for (let c = 0; c <= 9; c++) {
  base62int[c] = c;
}
for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) {
  base62int[String.fromCharCode(c)] = 10 + c - 'a'.charCodeAt(0);
}
for (let c = 'A'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) {
  base62int[String.fromCharCode(c)] = 36 + c - 'A'.charCodeAt(0);
}
for (const k in base62int) {
  int2base62[base62int[k]] = k;
}

function toBase62(n) {
  if (n === 0) {
    return '0';
  }
  const arr = [];
  while (n > 0) {
    const a = n % 62;
    n = Math.floor(n / 62);
    arr.unshift(int2base62[a]);
  }
  return arr.join("");
}

function fromBase62(s) {
  s = s.toString();
  let n = 0;
  // 右到左
  let base62 = 1;
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i];
    n += base62int[c] * base62;
    base62 *= 62;
  }
  return n;
}

// s 是base62
// add 是数字
function base62Add(s, add) {
  let n = fromBase62(s);
  n += add;
  return toBase62(n);
}

module.exports = {
  UInt8ArrayToBase64,
  Base64ToUInt8Array,

  getBitInArray,
  setBitInArray,
  setBitsValInArray,
  getBitsValInArray,

  array2dict,

  removeArrayElem,
  get_ip,
  pad,
  deepClone,

  toBase62,
  fromBase62,
  base62Add,
};
