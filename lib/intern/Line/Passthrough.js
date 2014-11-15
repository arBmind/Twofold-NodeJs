var OriginTextFromLine = require('../OriginTextFromLine');
var Interpolation = require('../../SourceMap').Interpolation;

module.exports = Passthrough;

function Passthrough(builder) {
  return function(line) {
    builder.addOriginScript(OriginTextFromLine(line, 0, line.text, Interpolation.OneToOne));
  };
}
