var vm = require('vm'),
  util = require('util'),
  esprima = require('esprima'),
  ScriptTargetBuilderApi = require('./intern/ScriptTargetBuilderApi'),
  MessageType = require('./MessageHandler').MessageType;
  PreparedTemplateBuilder = require('./PreparedTemplateBuilder');

module.exports = Engine;

function generateExceptionCallerStack(backtrace, sourceMap) {
  var callerStack = [];
  var re = /:(\d+):(\d+)\)?$/;
  backtrace = backtrace.split('\n').slice(1);
  for (var i = 0, l = backtrace.length; i < l; i++) {
    var traceLine = backtrace[i];
    if (-1 != traceLine.indexOf("[as runInNewContext]")) break;
    var m = traceLine.match(re);
    if (!m) continue;
    var line = parseInt(m[1]) - 1; // remove the first "try{" line
    var column = parseInt(m[2]);
    var position = sourceMap.findPosition(line, column);
    callerStack.push(position);
  }
  return callerStack;
}

function Engine(msgHandler, loader)
{
  function showSyntaxError(prepared) {
    try {
      esprima.parse(prepared.javascript);
    }
    catch (err) {
      var line = err.lineNumber;
      var column = err.column;
      var position = [ prepared.sourceMap.findPosition(line, column) ];
      var text = err.message.replace(/^Line \d+: /, '');
      msgHandler.javascriptMessage(MessageType.Error, position, text);
    }
  }
  function showException(exception, prepared) {
    if (!('stack' in exception)) {
      msgHandler.message(MessageType.Error, "Unknown exception: " + exception);
      return;
    }
    var positionStack = generateExceptionCallerStack(exception.stack, prepared.sourceMap);
    var text = "Uncaught Exception: " + exception.message;
    msgHandler.javascriptMessage(MessageType.Error, positionStack, text);
  }

  function exec(prepared, inputs) {
    var templateApi = ScriptTargetBuilderApi(prepared.originPositions);
    var sandbox =  util._extend({}, inputs);
    util._extend(sandbox, {_template: templateApi});
    if (prepared.script) {
      var result = prepared.script.runInNewContext(sandbox);
      if (result) {
        showException(result, prepared);
      }
    }
    return templateApi.build();
  }
  function prepare(name) {
    var prepared = PreparedTemplateBuilder(msgHandler, loader).build(name);
    try {
      prepared.script = vm.createScript("try{\n"+prepared.javascript+"\n}catch(e){e}", name + ".js");
    }
    catch(e) {
      showSyntaxError(prepared);
    }
    return prepared;
  }

  return {
    exec: exec,
    prepare: prepare,
    execTemplateName: function(name, inputs) {
      var prepared = prepare(name);
      return exec(prepared, inputs);
    }
  };
}
