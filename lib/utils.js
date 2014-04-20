var utils = exports = module.exports = {};

utils.escapeRegex = function(input){
    return String(input).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
        replace(/\x08/g, '\\x08');
};

utils.extractBlock = function(content, yieldStatement){
    var matchExpression = new RegExp(yieldStatement, 'gmi');
    var matches = matchExpression.exec(content);

    return matches;
};