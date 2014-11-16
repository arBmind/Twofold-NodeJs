var expect = require("should");
var data_driven = require('data-driven');
var Engine = require('../lib/Engine');
var LoaderStatus = require('../lib/TextLoader').Status;
var MessageHandler = require('../lib/MessageHandler');
var util = require('util');

function FakeMessageHandler() {
  var count = {message: 0, templateMessage: 0, javaScriptMessage: 0};
  var store = [];
  var msgHandler = MessageHandler();
  return {
    count: count,
    store: store,
    message: function (type, text) {
      count.message++;
      store.push([type, text]);
    },
    templateMessage: function (type, position, text) {
      count.templateMessage++;
      msgHandler.templateMessage.call(this, type, position, text);
    },
    javascriptMessage: function (type, positionStack, text) {
      count.javaScriptMessage++;
      msgHandler.javascriptMessage.call(this, type, positionStack, text);
    },
    display: function () {
      for (var i = 0, l = store.length; i < l; i++) msgHandler.message(store[i][0], store[i][1]);
    }
  };
}

var FAKE_TEMPLATE_NAME = "testTemplate";
var FAKE_INCLUDE_NAME = "include.tpl";
var FAKE_RECURSIVE_NAME = "recursive.tpl";
var FAKE_ERROR_LOADING_NAME = "errorLoding.tpl";
var FAKE_NOT_FOUND_NAME = "notFound.tpl";
function FakeTextLoader(text) {
  var results = {};
  results[FAKE_INCLUDE_NAME] = {
    status: LoaderStatus.Success,
    fullPath: FAKE_INCLUDE_NAME,
    text: "| Include Text"
  };
  results[FAKE_RECURSIVE_NAME] = {
    status: LoaderStatus.Success,
    fullPath: FAKE_RECURSIVE_NAME,
    text: "# include \"" + FAKE_RECURSIVE_NAME + "\""
  };
  results[FAKE_ERROR_LOADING_NAME] = {status: LoaderStatus.ErrorLoading};
  results[FAKE_NOT_FOUND_NAME] = {status: LoaderStatus.NotFound};

  return {
    load: function (name) {
      return results[name] || {
          status: LoaderStatus.Success,
          fullPath: name,
          text: text
        };
    }
  };
}

function clone(obj) {
  return util._extend({}, obj);
}

describe("Target Text", function () {
  var context = {
    qObject: {boolValue: true, stringValue: "Text", intValue: 1},
    qArray: ["value1", "value2", "value3"],
    boolValue: true,
    stringValue: "Text",
    intValue: 2
  };

  function buildTestData() {
    var callTemplate = ['',
      'function min(a, b) {',
      '  | #{Math.min(a, b)}',
      '}',
      '  = min(qObject.intValue, intValue);',
      ''
    ].join('\n');
    var multiline_expression = ['',
      'function called() {',
      '  |#{\'hello\\nworld\'}',
      '}',
      '  | simple',
      '  = called();',
      ''
    ].join('\n');
    var complex_callers = ['',
      'function a(p) {',
      '  \\a#{p}',
      //'  throw new Error("Hello");',
      '}',
      'function b(p) {',
      '  |#{a(p)}',
      '  |b#{p}',
      '}',
      '  = b(1);',
      '  |c',
      '  = b(2);',
      ''
    ].join('\n');

    return [
      {name: "empty", template: "|", target: "\n", context: {}, messages: [0, 0, 0]},
      {
        name: "text",
        template: " \t | \t Hello World \t ",
        target: " \t Hello World \t \n",
        context: {},
        messages: [0, 0, 0]
      },
      {
        name: "unescaped newline",
        template: "|Hello\\nWorld",
        target: "Hello\\nWorld\n",
        context: {},
        messages: [0, 0, 0]
      },
      {
        name: "expression",
        template: "|1 + 2 = #{ 1 + 2 }",
        target: "1 + 2 = 3\n",
        context: {},
        messages: [0, 0, 0]
      },
      {
        name: "escaped expression",
        template: "|####{ 1 + 2 }",
        target: "##{ 1 + 2 }\n",
        context: {},
        messages: [0, 0, 0]
      },
      {
        name: "newline expression",
        template: "|  #{'Hello\\nWorld'}",
        target: "  Hello\n  World\n",
        context: {},
        messages: [0, 0, 0]
      },

      {
        name: "line continue",
        template: "\\Hello\n| World\n",
        target: "Hello World\n",
        context: {},
        messages: [0, 0, 0]
      },
      {
        name: "line continue expr",
        template: "\\  Hello\n\\ #{'World\\nNext'}\n|",
        target: "  Hello World\n  Next\n",
        context: {},
        messages: [0, 0, 0]
      },
      {
        name: "missing close bracket",
        template: "|1 + 2 = #{ 1 + 2 ",
        target: "1 + 2 = \n",
        context: {},
        messages: [1, 1, 0]
      },
      {
        name: "runtime error",
        template: "| hello\n throw new Error('abc');\n| not reached",
        target: " hello\n",
        context: {},
        messages: [1, 0, 1]
      },
      {
        name: "context qObject",
        template: "|#{qObject.boolValue}, #{qObject.stringValue}, #{qObject.intValue}",
        target: "true, Text, 1\n",
        context: clone(context),
        messages: [0, 0, 0]
      },
      {
        name: "context qArray",
        template: "|#{qArray[0]}, #{qArray[1]}, #{qArray[2]}",
        target: "value1, value2, value3\n",
        context: clone(context),
        messages: [0, 0, 0]
      },
      {
        name: "context primitive",
        template: "|#{boolValue}, #{stringValue}, #{intValue}",
        target: "true, Text, 2\n",
        context: clone(context),
        messages: [0, 0, 0]
      },
      {
        name: "include",
        template: "# include \""+FAKE_INCLUDE_NAME+"\"",
        target: "  Include Text\n",
        context: clone(context),
        messages: [0, 0, 0]
      },
      {
        name: "include not found",
        template: "# include \""+FAKE_NOT_FOUND_NAME+"\"",
        target: "",
        context: clone(context),
        messages: [1, 1, 0]
      },
      {
        name: "include error loading",
        template: "# include \""+FAKE_ERROR_LOADING_NAME+"\"",
        target: "",
        context: clone(context),
        messages: [1, 1, 0]
      },
      {
        name: "include recursive",
        template: "# include \""+FAKE_RECURSIVE_NAME+"\"",
        target: "",
        context: clone(context),
        messages: [1, 1, 0]
      },
      {
        name: "call",
        template: callTemplate,
        target: "  1\n",
        context: clone(context),
        messages: [0, 0, 0]
      },
      {
        name: "multiline expression",
        template: multiline_expression,
        target: " simple\n hello\n world\n",
        context: clone(context),
        messages: [0, 0, 0]
      },
      {
        name: "complex callers",
        template: complex_callers,
        target: " a1\n b1\nc\n a2\n b2\n",
        context: clone(context),
        messages: [0, 0, 0]
      }
    ];
  }

  data_driven(buildTestData(), function () {
    it("#{name}", function (ctx) {
      var templateText = ctx.template,
        targetText = ctx.target,
        context = ctx.context,
        messageCount = {message: ctx.messages[0], templateMessage: ctx.messages[1], javaScriptMessage: ctx.messages[2]};

      var messageHandler = FakeMessageHandler();
      var textLoader = FakeTextLoader(templateText);
      var engine = Engine(messageHandler, textLoader);
      var target = engine.execTemplateName(FAKE_TEMPLATE_NAME, context);

      if (JSON.stringify(messageCount) != JSON.stringify(messageHandler.count)) {
        messageHandler.display();
      }
      messageCount.message.should.equal(messageHandler.count.message);
      messageCount.templateMessage.should.equal(messageHandler.count.templateMessage);
      messageCount.javaScriptMessage.should.equal(messageHandler.count.javaScriptMessage);
      target.text.should.equal(targetText);
    });
  });
});

describe("Target SourceMap", function () {
  var context = {};

  function buildTestData() {
    var complex_callers = ['',
      'function txta(p) {',
      '  \\txta#{p}',
      '}',
      'function txtb(p) {',
      '  |#{txta(p)}',
      '  |txtb#{p}',
      '}',
      '  = txtb(1);',
      '  |c',
      '  = txtb(2);',
      ''
    ].join('\n');

    return [
      {
        name: "inline expression 1",
        //                  1         2
        //         123456789012345678901234567
        template: "| simple #{(1 == 2)? 'Really?' : 'Correct'}",
        search: "Correct",
        position: [1, 12],
        callers: 1
      },

      //                                                           1
      //                                       123456789  12345678901
      {name: "inline expression 2", template: "| simple \n|#{'hello'}", search: "ello", position: [2, 4], callers: 1},
      {name: "complex callers 1", template: complex_callers, search: "txtb2", position: [7, 4], callers: 1},
      {name: "complex callers 2", template: complex_callers, search: "txta1", position: [3, 4], callers: 2}
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

  data_driven(buildTestData(), function () {
    it("#{name}", function (ctx) {
      var templateText = ctx.template,
        searchText = ctx.search,
        templateLine = ctx.position[0],
        templateColumn = ctx.position[1],
        callerCount = ctx.callers;

      var messageHandler = FakeMessageHandler();
      var textLoader = FakeTextLoader(templateText);
      var engine = Engine(messageHandler, textLoader);
      var target = engine.execTemplateName(FAKE_TEMPLATE_NAME, context);

      var text = target.text;
      var searchIdx = text.lastIndexOf(searchText);
      searchIdx.should.not.equal(-1);
      var lastNewline = text.lastIndexOf("\n", searchIdx) + 1;
      var targetColumn = (searchIdx - lastNewline) + 1;
      var targetLine = count(text, "\n", lastNewline) + 1;

      var source = target.sourceMap.findBlock(targetLine, targetColumn);
      source.origin.line.should.equal(templateLine);
      source.origin.column.should.equal(templateColumn);

      var callers = target.sourceMap.callerStack(source);
      callers.length.should.equal(callerCount);
    });
  });
});
