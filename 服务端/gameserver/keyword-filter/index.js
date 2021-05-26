/**
 * Created by Administrator on 2015/2/6.
 */
const keyword = require('./keywordMap');

let filterMap = keyword.reload();
const endTag = keyword.endTag;

const keyfilter = module.exports;

/**
 * 判斷文字中是否有敏感關鍵字
 * @param text
 * @returns {boolean}
 */
keyfilter.hasKeyword = function(text) {
    if (text === null || text === undefined) {
        return false;
    }
    const charArray = text.split('');
    const len = charArray.length;
    for (let i = 0; i < len; i++) {
        let index = i;
        let sub = filterMap.get(charArray[index]);
        while (sub != null) {
            if (sub.has(endTag)) {
                return true;
            }
            index += 1;
            if (index >= len) {
                return false;
            }
            sub = sub.get(charArray[index]);
        }
    }
    return false;
};

/**
 * 替換關鍵字
 * @param text
 * @param replaceWord
 */
keyfilter.replaceKeyword = function(text, replaceWord) {
    if (text === null || text === undefined || replaceWord === null || replaceWord.length === 0) {
        return text;
    }
    const charArray = text.split('');
    const len = charArray.length;
    let newText = '';
    let i = 0;
    while (i < len) {
        let end = -1;
        var index;
        let sub = filterMap;
        for (var index = i; index < len; index++) {
            sub = sub.get(charArray[index]);
            if (sub == null) {
                if (end === -1) {
                    newText += charArray[i];
                    i++;
                    break;
                } else {
                    for (var j = i; j <= end; j++) {
                        newText += replaceWord;
                    }
                    i = end + 1;
                    break;
                }
            } else {
                if (sub.has(endTag)) {
                    end = index;
                }
            }
        }
        if (index >= len) {
            // 字符串结束
            if (end === -1) {
                // 没匹配到任何关键词
                newText += charArray[i];
                i++;
            } else {
                // 将最长匹配字符串替换为特定字符
                for (var j = i; j <= end; j++) {
                    newText += replaceWord;
                }
                i = end + 1;
            }
        }
    }
    return newText;
};

keyfilter.addKeyWords = function(wordsArray) {
    filterMap = keyword.addKeyWords(wordsArray);
};

keyfilter.reload = function() {
    filterMap = keyword.reload();
};