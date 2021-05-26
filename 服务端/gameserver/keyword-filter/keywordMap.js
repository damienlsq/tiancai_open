/**
 * Created by Administrator on 2015/2/4.
 */
const fs = require('fs');
const path = require('path');
const HashMap = require('hashmap').HashMap;

let filterMap;
const endTag = '\0'; // 关键词结束符

function addKeyWords(filterWordList) {
    for (let i = 0; i < filterWordList.length; i++) {
        const charArray = filterWordList[i].split('');
        const len = charArray.length;
        if (len > 0) {
            let subMap = filterMap;
            for (let k = 0; k < len - 1; k++) {
                const obj = subMap.get(charArray[k]);
                if (obj == null) {
                    const subMapTmp = new HashMap();
                    subMap.set(charArray[k], subMapTmp);
                    subMap = subMapTmp;
                } else {
                    subMap = obj;
                }
            }
            // 處理最后一個字符
            const obj = subMap.get(charArray[len - 1]);
            if (obj == null) {
                const subMapTmp = new HashMap();
                subMapTmp.set(endTag, null);
                subMap.set(charArray[len - 1], subMapTmp);
            } else {
                obj.set(endTag, null);
            }
        }
    }
    return filterMap;
}

function reload() {
    filterMap = new HashMap();
    /*
    const filePath = path.join(__dirname, './keyword.txt');
    const data = fs.readFileSync(filePath, {
        encoding: 'utf-8',
    });
    */
    const data = require('./keyword.txt.js');
    return addKeyWords(data.split(/\r?\n/));
}

reload();

module.exports = {
    addKeyWords,
    reload,
    endTag,
};