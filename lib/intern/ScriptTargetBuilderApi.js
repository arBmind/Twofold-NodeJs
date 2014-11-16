var SourceMapTextBuilder = require('./SourceMapTextBuilder');
var Interpolation = require('../SourceMap').Interpolation;

module.exports = ScriptTargetBuilderApi;

function ScriptTargetBuilderApi(originPositions)
{
  var sourceMapBuilder = SourceMapTextBuilder();
  var partIndent = "", indentationStack = [];

  function append(text, originIndex) {
    sourceMapBuilder.addOriginText({
      origin: originPositions[originIndex],
      span: text ? (text + '') : '',
      interpolation: Interpolation.None
    });
  }
  function pushIndentation(indent, originIndex) {
    var fullIndent = indent + (indentationStack[indentationStack.length - 1] || ['',''])[1];
    indentationStack.push([indent, fullIndent]);
    sourceMapBuilder.pushCaller(originPositions[originIndex]);
    sourceMapBuilder.setIndentation(fullIndent);
  }
  function popIndentation() {
    indentationStack.pop();
    sourceMapBuilder.popCaller();

    var fullIndent = (indentationStack[indentationStack.length - 1] || ['',''])[1];
    sourceMapBuilder.setIndentation(fullIndent);
  }
  function indentPart(indent, originIndex) {
    if (sourceMapBuilder.isBlankLine()) partIndent = indent;
    sourceMapBuilder.addOriginText({
      origin: originPositions[originIndex],
      span: indent,
      interpolation: Interpolation.None
    });
  }
  function pushPartIndent(originIndex) {
    pushIndentation(partIndent, originIndex);
  }
  function popPartIndent() {
    partIndent = indentationStack[indentationStack.length - 1][0];
    popIndentation();
  }

  return {
    build: function() { return sourceMapBuilder.build(); },
    append: append,
    newLine: function() { sourceMapBuilder.addNewLine(); },
    pushIndentation: pushIndentation,
    popIndentation: popIndentation,
    indentPart: indentPart,
    pushPartIndent: pushPartIndent,
    popPartIndent: popPartIndent
  };
}
