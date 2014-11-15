var OriginTextFromLine = require('../OriginTextFromLine');
var MessageType = require('../../MessageHandler').MessageType;
var MapInterpolation = require('../../SourceMap').Interpolation;

module.exports = Interpolation;

function Interpolation(msgHandler, builder)
{
  function findQuoteEnd(text, index, quote) {
    var re = new RegExp("[\\\\"+quote+"]", 'g');
    re.lastIndex = index;
    while((m = re.exec(text)) !== null) {
      if (m[0] == quote) return re.lastIndex;
      re.lastIndex = re.lastIndex + 1;
    }
    return text.length;
  }
  function findExpressionEnd(text) {
    var depth = 0;
    var re = /[{}"']/g, m;
    while((m = re.exec(text)) !== null) {
      switch(m[0]) {
        case '{':
          ++depth;
          break;
        case '}':
          if (0 == depth) return m.index;
          --depth;
          break;
        default: // quote
          re.lastIndex = findQuoteEnd(text, re.lastIndex, m[0]);
      }
    }
    return text.length;
  }

  return function(line) {
    builder.addIndentTargetPart(OriginTextFromLine(line, line.secondIndentOffset, line.secondIndent));
    var text = line.tail;
    var offset = line.tailOffset;
    while(true) {
      var m = text.match(/^(.*?)(?:(##)|(#{))/);
      if (!m) break;
      text = text.slice(m[1].length + 2);
      if (m[2]) {
        builder.addOriginTarget(OriginTextFromLine(line, offset, m[1]+'#'));
        offset += m[1].length + 2;
      }
      else {
        builder.addOriginTarget(OriginTextFromLine(line, offset, m[1]));
        offset += m[1].length + 2;
        var exprLength = findExpressionEnd(text);
        if (exprLength >= text.length) {
          msgHandler.templateMessage(MessageType.Error, line.position, "Missing close bracket!");
          break;
        }
        builder.addOriginScriptExpression(OriginTextFromLine(line, offset, text.slice(0, exprLength), MapInterpolation.OneToOne));
        text = text.slice(exprLength + 1);
      }
    }
    builder.addOriginTarget(OriginTextFromLine(line, offset, text));
  };
}
