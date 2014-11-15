var SourceMapTextBuilder = require("./SourceMapTextBuilder");
var Interpolation = require('../SourceMap').Interpolation;

module.exports = PreparedScriptBuilder;

function PreparedScriptBuilder()
{
  var sourceMapBuilder = SourceMapTextBuilder();
  var originPositions = [];

  function buildText(position, columnOffset, span, interpolation) {
    var origin = {
      fileName: position.fileName,
      line: position.line,
      column: position.column + columnOffset
    };
    return {
      origin: origin,
      span: span,
      interpolation: interpolation
    };
  }
  function escapeForJavascriptString(source) {
    return source.replace(/([\\"'\r\n])/g, function(m,c){
      if (c == '\n') return "\\n";
      if (c == '\r') return "\\r";
      return "\\" + c;
    });
  }

  function addOriginPosition(position) {
    originPositions.push(position);
    return originPositions.length - 1;
  }
  function build() {
    var sourceMapText = sourceMapBuilder.build();
    return {
      javascript: sourceMapText.text,
      sourceMap: sourceMapText.sourceMap,
      originPositions: originPositions
    };
  }
  function addOriginScript(script) {
    sourceMapBuilder
      .addOriginText(script)
      .addNewLine();
    return this;
  }
  function addOriginScriptExpression(expr) {
    if (0 == expr.span.length)
      return this;
    var originIndex = addOriginPosition(expr.origin);
    var prefix = "_template.pushPartIndent("+originIndex+");_template.append(";
    var postfix = ", "+originIndex+");_template.popPartIndent();\n";
    sourceMapBuilder
      .addOriginText(buildText(expr.origin, -2, prefix))
      .addOriginText(expr)
      .addOriginText(buildText(expr.origin, expr.span.length, postfix));
    return this;
  }
  function addOriginTarget(target) {
    if (0 == target.span.length)
      return this;
    var originIndex = addOriginPosition(target.origin);
    var prefix = "_template.append(\"";
    var postfix = "\", "+originIndex+");\n";
    sourceMapBuilder
      .addOriginText(buildText(target.origin, -1, prefix))
      .addOriginText(buildText(target.origin, 0, escapeForJavascriptString(target.span), Interpolation.OneToOne))
      .addOriginText(buildText(target.origin, target.span.length, postfix));
    return this;
  }
  function addIndentTargetPart(indent) {
    var originIndex = addOriginPosition(indent.origin);
    var prefix = "_template.indentPart(\"";
    var postfix = "\", "+ originIndex +");\n";
    sourceMapBuilder
      .addOriginText(buildText(indent.origin, -1, prefix))
      .addOriginText(buildText(indent.origin, 0, escapeForJavascriptString(indent.span), Interpolation.OneToOne))
      .addOriginText(buildText(indent.origin, indent.span.length, postfix));
    return this;
  }
  function pushTargetIndentation(indent) {
    var originIndex = addOriginPosition(indent.origin);
    var prefix = "_template.pushIndentation(\"";
    var postfix = "\", "+ originIndex +");\n";
    sourceMapBuilder
      .addOriginText(buildText(indent.origin, -1, prefix))
      .addOriginText(buildText(indent.origin, 0, escapeForJavascriptString(indent.span), Interpolation.OneToOne))
      .addOriginText(buildText(indent.origin, indent.span.length, postfix));
    return this;
  }
  function popTargetIndentation(indent) {
    var code = "_template.popIndentation();\n";
    sourceMapBuilder
      .addOriginText({origin: indent.origin, span: code});
    return this;
  }
  function addTargetNewLine(newLine) {
    var code = "_template.newLine();\n";
    sourceMapBuilder
      .addOriginText({origin: newLine.origin, span: code});
    return this;
  }
  function addNewLine() {
    sourceMapBuilder.addNewLine();
    return this;
  }

  return {
    build: build,
    indentation: function() { return sourceMapBuilder.indentation(); },
    setIndentation: function(indent) { sourceMapBuilder.setIndentation(indent); },
    addOriginScript: addOriginScript,
    addOriginScriptExpression: addOriginScriptExpression,
    addOriginTarget: addOriginTarget,
    addIndentTargetPart: addIndentTargetPart,
    pushTargetIndentation: pushTargetIndentation,
    popTargetIndentation: popTargetIndentation,
    addTargetNewLine: addTargetNewLine,
    addNewLine: addNewLine
  };
}
