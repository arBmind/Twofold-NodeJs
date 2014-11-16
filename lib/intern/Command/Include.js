var OriginTextFromLine = require('../OriginTextFromLine');
var LoaderStatus = require('../../TextLoader').Status;
var MessageType = require('../../MessageHandler').MessageType;

module.exports = Include;

function Include(msgHandler, loader, builder, processor)
{
  var stack = [];
  function extractNameArg(command) {
    var name = command.args.trim();
    if (name.length < 2 || name[0] != '"' || name[name.length-1] != '"')
      return "";
    return name.slice(1, name.length-1);
  }
  function reportArgError(command, message) {
    msgHandler.templateMessage(MessageType.Error, command.line.position, message);
  }
  function reportLoaderError(command, name, status) {
    var message = ((status == LoaderStatus.NotFound) ? "Could not find " : "Could not load ") + name;
    msgHandler.templateMessage(MessageType.Error, command.line.position, message);
  }
  function reportStackError(command) {
    var lines = stack.map(function(entry) { return "included: " + entry }).reverse();
    lines.push("Include depth too deep: " + stack.length);
    msgHandler.templateMessage(MessageType.Error, command.line.position, lines.join('\n'));
  }

  return function(command) {
    var name = extractNameArg(command);
    if (0 === name.length) {
      reportArgError(command, "filename argument in \"quotes\" required!");
      return;
    }
    var result = loader.load(name);
    if (result.status != LoaderStatus.Success) {
      reportLoaderError(command, name, result.status);
      return;
    }
    if (stack.length >= 1000) {
      reportStackError(command);
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
