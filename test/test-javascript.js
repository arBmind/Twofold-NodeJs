var expect = require("should");
var data_driven = require('data-driven');
var template_engine = require("../lib/template-engine.js");
var util = require('util');

function FakeMessageHandler() {
  var count = { message: 0, templateMessage: 0, javaScriptMessage: 0 };
  return {
    count: count,
    message: function(type, text) {
      count.message++;
    },
    templateMessage: function(type, position, text) {
      count.templateMessage++;
      console.error(text);
    },
    javaScriptMessage: function(type, positionStack, text) {
      count.javaScriptMessage++;
    }
  };
}
var FAKE_TEMPLATE_NAME = "testTemplate";
function FakeTextLoader(text) {
  return {
    load: function(name) {
      return {
        status: template_engine.Loader.Success,
        fullPath: name,
        text: text
      };
    }
  };
}

describe("Interpolation", function() {
  function buildTestData() {
    var newLine = "_template.newLine();\n";
    var _output = "_template.append(\"%s\", %d);\n";
    var _indentPart = "_template.indentPart(\"%s\", %d);\n";
    var _expression = "_template.pushPartIndent(%d);_template.append(%s, %d);_template.popPartIndent();\n";

    var output = function(text, originIndex) { return util.format(_output, text, originIndex); };
    var indentPart = function(text, originIndex) { return util.format(_indentPart, text, originIndex); };
    var expression = function(text, originIndex) { return util.format(_expression, originIndex, text, originIndex); };

    return [
      {name: "empty", template: "|", js: indentPart("",0) + newLine},
      {name: "simple", template: "|simple ", js: indentPart("", 0) + output("simple ", 1) + newLine},
      {name: "indentation space", template: "\t| simple", js: indentPart(" ", 0) + output("simple", 1) + newLine},
      {name: "indentation tab", template: " |\tsimple", js: indentPart("\t", 0) + output("simple", 1) + newLine},

      {name: "no expr", template: "|#(test", js: indentPart("", 0) + output("#(test", 1) + newLine},
      {name: "escaped expr", template: "|##{test", js: indentPart("", 0) + output("#", 1) + output("{test", 2) + newLine},
      {name: "single expr 1", template: "|#{test}", js: indentPart("", 0) + expression("test", 1) + newLine},
      {name: "single expr 2", template: "|#{test}}", js: indentPart("", 0) + expression("test", 1) + output("}", 2) + newLine},
      {name: "inline expr 1", template: "|simple #{test.prop} expr", js: indentPart("", 0) + output("simple ", 1) + expression("test.prop", 2) + output(" expr", 3) + newLine},
      {name: "logic expr", template: "|#{ (i==0 ? ':' : \",\") }", js: indentPart("", 0) + expression(" (i==0 ? ':' : \",\") ", 1) + newLine},
      {name: "escaped expr 1", template: "|escape ##{test} expr", js: indentPart("", 0) + output("escape #", 1) + output("{test} expr", 2) + newLine},
      {name: "escaped expr 2", template: "|###{test}", js: indentPart("", 0) + output("#", 1) + expression("test", 2) + newLine},
      {name: "string expr 1", template: "|#{\"}\"}", js: indentPart("", 0) + expression("\"}\"", 1) + newLine},
      {name: "string expr 2", template: "|#{'\\'\\\"}'}", js: indentPart("", 0) + expression("'\\'\\\"}'", 1) + newLine},
      {name: "nested expr", template: "|#{'#{hello}'}", js: indentPart("", 0) + expression("'#{hello}'", 1) + newLine},
    ];
  }

  data_driven(buildTestData(), function() {
    it("#{name}", function(ctx) {
      var templateText = ctx.template;
      var javaScriptText = ctx.js;
      var messageHandler = FakeMessageHandler();
      var textLoader = FakeTextLoader(templateText);
      var builder = template_engine.PreparedTemplateBuilder(messageHandler, textLoader);
      var prepared = builder.build(FAKE_TEMPLATE_NAME);

      prepared.should.have.property("javascript");
      prepared.should.have.property("sourceMap");

      messageHandler.count.message.should.equal(0);
      messageHandler.count.templateMessage.should.equal(0);
      messageHandler.count.javaScriptMessage.should.equal(0);

      prepared.javascript.should.equal(javaScriptText, "prepared.javascript");
    });
  });
});
