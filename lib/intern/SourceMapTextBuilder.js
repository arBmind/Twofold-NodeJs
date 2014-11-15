var TextBuilder = require("./TextBuilder");
var SourceMap = require("../SourceMap").SourceMap;

module.exports = SourceMapTextBuilder;

// A specialized TextBuilder the generates SourceMaps
function SourceMapTextBuilder()
{
  var textBuilder = TextBuilder();
  var entries = [], callers = [], callerIndexStack = [];

  function build() {
    var text = textBuilder.build();
    return { sourceMap: SourceMap(entries, callers), text: text };
  }
  function pushCaller(position) {
    var parentIndex = callerIndexStack[callerIndexStack.length - 1];
    var index = callers.length;
    callers.push({ position: position, parentIndex: parentIndex });
    callerIndexStack.push(index);
  }
  function popCaller() {
    callerIndexStack.pop();
  }
  function addOriginText(originText) {
    if (0 == originText.span.length)
      return this;
    var callerIndex = callerIndexStack[callerIndexStack.length - 1];
    entries.push({
      origin: originText.origin,
      generatedLine: textBuilder.line(),
      generatedColumn: textBuilder.column(),
      interpolation: originText.interpolation,
      callerIndex: callerIndex
    });
    textBuilder.addText(originText.span);
    return this;
  }
  function addNewLine() {
    textBuilder.addNewLine();
    return this;
  }

  return {
    build: build,
    indentation: function() { return textBuilder.indentation(); },
    isBlankLine: function() { return textBuilder.isBlankLine(); },
    setIndentation: function(indent) { textBuilder.setIndentation(indent); },
    pushCaller: pushCaller,
    popCaller: popCaller,
    addOriginText: addOriginText,
    addNewLine: addNewLine
  };
}
