var vm = require('vm'),
  ScriptTargetBuilderApi = require('./intern/ScriptTargetBuilderApi'),
  PreparedTemplateBuilder = require('./PreparedTemplateBuilder');

exports.Engine = Engine;

function Engine(msgHandler, loader)
{
  function exec(prepared, inputs) {
    var sandbox = Object.clone(inputs);
    var templateApi = ScriptTargetBuilderApi(prepared.originPositions);
    sandbox._template = templateApi;
    try {
      vm.runInNewContext(prepared.javascript, sandbox);
    }
    catch(e){
      // TODO: report errors (vm will always print stderr)
    }
    return templateApi.build();
  }
  function prepare(name) {
    return PreparedTemplateBuilder(msgHandler, loader).build(name);
    // TODO: Check Syntax
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
