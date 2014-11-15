var OriginTextFromLine = require('../OriginTextFromLine');
var LineInterpolation = require('./Interpolation');

module.exports =  InterpolationWithNewLine;

function InterpolationWithNewLine(msgHandler, builder)
{
  var interpolation = LineInterpolation(msgHandler, builder);
  return function(line) {
    interpolation(line);
    builder.addTargetNewLine(OriginTextFromLine(line, line.text.length, ""));
  };
}
