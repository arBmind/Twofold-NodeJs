var expect = require("should");
var data_driven = require('data-driven');
var PreparedTemplateBuilder = require('../lib/PreparedTemplateBuilder.js');
var LoaderStatus = require('../lib/TextLoader.js').Status;
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
        status: LoaderStatus.Success,
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
      {name: "nested expr", template: "|#{'#{hello}'}", js: indentPart("", 0) + expression("'#{hello}'", 1) + newLine}
    ];
  }

  data_driven(buildTestData(), function() {
    it("#{name}", function(ctx) {
      var templateText = ctx.template;
      var javaScriptText = ctx.js;
      var messageHandler = FakeMessageHandler();
      var textLoader = FakeTextLoader(templateText);
      var builder = PreparedTemplateBuilder(messageHandler, textLoader);
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

describe("SourceMap", function() {
  function buildTestData() {
    return [
      //                                                1         2
      //                                       123456789012345678901234567
      {name: "inline expression 1", template: "if(test) { return 1 : 2 }", search: "1 : 2", position: [1, 19]},
      {name: "inline expression 2", template: "| simple #{(test)? 1 : 2 )}", search: "1 : 2", position: [1, 20]},

      //                                                 1         2
      //                                       123456789 012345678901
      {name: "inline expression 3", template: "| simple \n|#{'hello'}", search: "hello", position: [2, 5]},

      //                                              1         2
      //                                    123456789 012345678901
      {name: "generated code 1", template: "| simple \n|#{'hello'}", search: "pend('hello", position: [2, 2]},
      {name: "generated code 2", template: "|#{'hello'}", search: ", 1);_template.pop", position: [1, 11]}
    ];
  }
  function count(string, subString, maxIdx) {
    if (subString.length <= 0)
      return string.length+1;

    var n = 0, pos = 0;
    var step = subString.length;
    while (true) {
      pos = string.indexOf(subString, pos);
      if (pos < 0) break; // not found
      if (pos > maxIdx) break; // end reached
      n++;
      pos += step;
    }
    return n;
  }

  data_driven(buildTestData(), function() {
    it("#{name}", function(ctx) {
      var templateText = ctx.template,
        searchText = ctx.search,
        templateLine = ctx.position[0],
        templateColumn = ctx.position[1];

        var messageHandler = FakeMessageHandler();
        var textLoader = FakeTextLoader(templateText);
        var builder = PreparedTemplateBuilder(messageHandler, textLoader);
        var prepared = builder.build(FAKE_TEMPLATE_NAME);

        var js = prepared.javascript;
        var searchIdx = js.lastIndexOf(searchText);
        searchIdx.should.not.equal(-1);
        var lastNewline = js.lastIndexOf("\n", searchIdx) + 1;
        var generatedColumn = (searchIdx - lastNewline) + 1;
        var generatedLine = count(js, "\n", lastNewline) + 1;

        var source = prepared.sourceMap.findPosition(generatedLine, generatedColumn);

        source.line.should.equal(templateLine);
        source.column.should.equal(templateColumn);
    });
  });
});
