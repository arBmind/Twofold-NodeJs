var OriginTextFromLine = require('../OriginTextFromLine');

module.exports = IndentedScript;

function IndentedScript(builder)
{
  return function(line) {
    builder.pushTargetIndentation(OriginTextFromLine(line, line.secondIndentOffset, line.secondIndent));
    builder.addOriginScript(OriginTextFromLine(line, line.tailOffset, line.tail));
    builder.popTargetIndentation(OriginTextFromLine(line, line.text.length, ""));
  }
};
