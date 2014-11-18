var Benchmark = require('benchmark');
var Engine = require('../lib/Engine');
var LoaderStatus = require('../lib/TextLoader').Status;
var MessageHandler = require('../lib/MessageHandler');
var util = require('util');

var FAKE_LIB_NAME = "lib.twofold";
function FakeTextLoader() {
  var results = {};
  results[FAKE_LIB_NAME] = {
    status: LoaderStatus.Success,
    fullPath: FAKE_LIB_NAME,
    text: [
      "for(var i = 0; i <= 10000; i++) {",
      "    | Das ist ein kurzer Text! #{i}",
      "    # include \"lib.twofold\"",
      "}",
      "|---------------------------------",
      "|",
      "function structFieldHeader(type) {",
      "  |#{ type.name }",
      "  |struct #{ type.name } {",
      "  |};",
      "}",
      "",
      "if (type.isArray) {",
      "    | // #{ type.name } Type is an Array #{type.text}\"",
      "    = structFieldHeader(type);",
      "}",
      "",
      "    |class #{ name } {",
      "     for(var i = 0; i < baseNames.length; i++) {",
      "    |  #{ (i==0 ? ':' : ',') } public #{ baseNames[i] }",
      "     }",
      "|};      ",
      ""].join('\n')
  };
  var fallbackText = [ "|Line 1 included", "|Line 2 incldued"].join("\n");

  return {
    load: function (name) {
      return results[name] || { status: LoaderStatus.Success, fullPath: name,  text: fallbackText };
    }
  };
}

var messageHandler = MessageHandler();
var textLoader = FakeTextLoader();
var engine = Engine(messageHandler, textLoader);

var suite = new Benchmark.Suite("benchmark");

suite.add("Benchmark#prepare", function () {
  engine.prepare("TextTemplate.twofold");
});

var prepared = engine.prepare("TextTemplate.twofold");
var context = {
  type: { isArray: true, name: "TestArray" },
  baseNames: ["base1", "base2", "base3"],
  name: "Main"
};

suite.add("Benchmark#execute", function () {
  engine.exec(prepared, context);
});

suite.on('cycle', function(event) {
  console.log(String(event.target) + ' time: ' + String(event.target.times.period));
});

suite.run({'async': true});
