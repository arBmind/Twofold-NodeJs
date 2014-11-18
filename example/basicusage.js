var Engine = require('../lib/Engine');
var LoaderStatus = require('../lib/TextLoader').Status;
var MessageHandler = require('../lib/MessageHandler');

function FakeTextLoader() {
  var included_twofold = [
    "function methodArgs(args) {",
    "  args.forEach(function(arg, i){",
    "    if (0!=i) {",
    "        // use interpolation to preserve the whitespace",
    "        \\#{', '}",
    "    }",
    "    // use backslash to avoid linebreaks",
    "        \\arg",
    "  });",
    "}",
    "function showMethod(method) {",
    "        |function #{method.name}(#{methodArgs(method.args)}) {",
    "  // if body contains multiple lines they will all be indented",
    "        |  #{method.body}",
    "        |}",
    "}"
  ].join('\n');

  var main_twofold = [
    "#include \"included.twofold\"",
    "",
    "        |function #{name}Class(#{methodArgs(args)}) {",
    "methods.forEach(function(method){",
    "  // every line outputted by showMethod is indented by two extra spaces",
    "        =  showMethod(method)",
    "});",
    "        |",
    "        |  return {",
    "methods.forEach(function(method, i){",
    "        |    \"#{method.name}\": #{method.name}#{(i+1 < methods.length) ? ',' : ''}",
    "});",
    "        |  };",
    "        |}",
    ""].join('\n');

  return {
    load: function (name) {
      if (name == "included.twofold") {
        return { status: LoaderStatus.Success, name: name, text: included_twofold };
      }
      if (name == "main.twofold") {
        return { status: LoaderStatus.Success, name: name, text: main_twofold };
      }
      return { status: LoaderStatus.NotFound };
    }
  };
}

var messageHandler = MessageHandler();
var textLoader = FakeTextLoader();
var engine = Engine(messageHandler, textLoader);
var prepared = engine.prepare("main.twofold");

console.log('generated javascript:\n');
console.log(prepared.javascript);
console.log("----\n");

var context = {
  "name": "TwofoldGenerated",
  "args": [],
  "methods": [
    {
      "name": "hello",
      "args": ["greeted"],
      "body": "console.log('Hello ' + greeted);"
    }
  ]
};

var target = engine.exec(prepared, context);

console.log("generated sourcecode:\n");
console.log(target.text);
console.log("----\n");
console.log("done\n");
