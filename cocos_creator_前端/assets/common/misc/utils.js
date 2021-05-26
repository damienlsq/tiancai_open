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


function removeArrayElem(arr, v) {
  const idx = arr.indexOf(v);
  if (idx !== -1) {
    arr.splice(idx, 1);
  }
}

function pad(n, width, z) {
  z = z || '0';
  n = `${n}`;
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

module.exports = {
  removeArrayElem,
  deepClone,
  pad,
};