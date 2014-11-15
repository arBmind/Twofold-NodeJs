
module.exports = OriginTextFromLine;

function OriginTextFromLine(line, offset, span, interpolation)
{
  var position = {
    filePath: line.position.filePath,
    line: line.position.line,
    column: 1 + offset
  };
  return {
    origin: position,
    span: span,
    interpolation: interpolation
  };
}
