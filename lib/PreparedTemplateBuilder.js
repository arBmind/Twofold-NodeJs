var PreparedScriptBuilder = require('./intern/PreparedScriptBuilder'),
  LineProcessor = require('./intern/LineProcessor'),
  LinePassthrough = require('./intern/Line/Passthrough'),
  LineInterpolation = require('./intern/Line/Interpolation'),
  LineInterpolationWithNewline = require('./intern/Line/InterpolationWithNewLine'),
  LineIndentedScript = require('./intern/Line/IndentedScript'),
  LineCommand = require('./intern/Line/Command'),
  CommandMissing = require('./intern/Command/Missing'),
  CommandInclude = require('./intern/Command/Include');

module.exports = PreparedTemplateBuilder;

function PreparedTemplateBuilder(msgHandler, loader)
{
  var preparedScriptBuilder = PreparedScriptBuilder();
  var lineProcessor = (function(){
    var lineMap = {};
    var lineDefault = LinePassthrough(preparedScriptBuilder);
    var processor = LineProcessor(lineMap, lineDefault);
    lineMap['\\'] = LineInterpolation(msgHandler, preparedScriptBuilder);
    lineMap['|'] = LineInterpolationWithNewline(msgHandler, preparedScriptBuilder);
    lineMap['='] = LineIndentedScript(preparedScriptBuilder);
    lineMap['#'] = (function(){
      var commandMap = {};
      var commandFallback = CommandMissing(msgHandler);
      var commands = LineCommand(commandMap, commandFallback);
      commandMap['include'] = CommandInclude(msgHandler, loader, preparedScriptBuilder, processor);
      return commands;
    })();
    return processor;
  })();

  return {
    build: function(name) {
      var result = loader.load(name);
      lineProcessor(result.fullPath, result.text);
      return preparedScriptBuilder.build();
    }
  };
}
