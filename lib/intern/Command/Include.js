var MessageType = require('../../MessageHandler').MessageType;

module.exports = Include;

function Include(msgHandler, loader, processor)
{
  var stack = [];
  function extractNameArg(command) {

  }
  return function(command) {
    var name = extractNameArg(command);
    if (0 === name.length) {
      // TODO
      return;
    }
    var result = loader.load(name);
    if (result.status != Loader.Success) {
      // TODO
      return;
    }
    if (stack.length >= 1000) {
      // TODO
      return;
    }
    stack.push(name);

    var line = command.line;
    builder.pushTargetIndentation(OriginTextFromLine(line, line.secondIndentOffset, line.secondIndent));
    processor(result.fullPath, result.text);
    builder.popTargetIndentation(OriginTextFromLine(line, line.text.length, ""));

    stack.pop(name);
  }
}
