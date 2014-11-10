(function() {
  var fs = require('fs');
  var Path = require('path');
  var vm = require('vm');

  var exports = module.exports = {};

  var Loader = { Success: 1, NotFound: 2, ErrorLoading: 3 };
  exports.Loader = Loader;

  var MessageType = { Info: 1, Warning: 2, Error: 3 };
  exports.MessageType = MessageType;

  exports.PathTextFileLoader =
  PathTextFileLoader = function()
  {
    var pathes = [];

    function load(name) {
      var found = false;
      for (var i=0; i < pathes.length; ++i) {
        var path = pathes[i];
        var fullPath = Path.resolve(path, name);
        if (!fs.existsSync(fullPath)) continue;
        try {
          var text = fs.readFileSync(fullPath, {encoding: 'utf8'});
          return { status: Loader.Success, fullPath: fullPath, text: text };
        }
        catch(e) {
          found = true;
        }
      }
      return {
        status: found ? Loader.ErrorLoading : NotFound,
        fullPath: "",
        text: ""
      };
    }

    return {
      load: load,
      addPath: function(path) { pathes.push(path); }
    }
  }

  function TextBuilder()
  {
    var buffer = [], indentation = "", line = 1, column = 0;

    function addText(text) {
      while (true) {
        if (0 == text.length) break;
        if (0 == column) buffer.push(indentation);
        var m = text.match(/^(.*?)\n/);
        if (m) {
          buffer.push(m[0]);
          ++line;
          column = 0;
          text = text.slice(m[0].length);
        }
        else {
          if (0 == column) column = indentation.length;
          column += text.length
          buffer.push(text);
          break;
        }
      }
      return this;
    }
    function addNewLine() {
      ++line;
      column = 0;
      buffer.push("\n");
      return this;
    }

    return {
      build: function() { return buffer.join(''); },
      indentation: function() { return indentation; },
      isBlankLine: function() { return 0 == column; },
      line: function() { return line; },
      column: function() { return column; },
      setIndentation: function(indent) { indentation = indent; },
      addText: addText,
      addNewLine: addNewLine,
    };
  }

  var Interpolation = { None: undefined, OneToOne: 1 };

  exports.SourceMap =
  SourceMap = function(entries, callers)
  {

    return {

    };
  }

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
      .addOriginText(buildText(target.origin, 0, escapeForJavascriptString(target.span)))
      .addOriginText(buildText(target.origin, target.span.length, postfix));
      return this;
    }
    function addIndentTargetPart(indent) {
      var originIndex = addOriginPosition(indent.origin);
      var prefix = "_template.indentPart(\"";
      var postfix = "\", "+ originIndex +");\n";
      sourceMapBuilder
      .addOriginText(buildText(indent.origin, -1, prefix))
      .addOriginText(buildText(indent.origin, 0, escapeForJavascriptString(indent.span)))
      .addOriginText(buildText(indent.origin, indent.span.length, postfix));
      return this;
    }
    function pushTargetIndentation(indent) {
      var originIndex = addOriginPosition(indent.origin);
      var prefix = "_template.pushIndentation(\"";
      var postfix = "\", "+ originIndex +");\n";
      sourceMapBuilder
      .addOriginText(buildText(indent.origin, -1, prefix))
      .addOriginText(buildText(indent.origin, 0, escapeForJavascriptString(indent.span)))
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

  function LineProcessor(map, fallback){
    return function(name, text){
      var line = {
        position: {
          name: name,
          line: 0,
          column: 0
        },
      };
      (text || '').split(/\r\n?|\n\r?/).forEach(function(lineText){
        line.position.line++;
        line.text = lineText;
        var m = lineText.match(/^(\s*)(\S)(\s*)/);
        if (m) {
          line.indentation = m[1];
          var key = m[2];
          line.secondIndentOffset = m[1].length + m[2].length;
          line.secondIndent = m[3];
          line.tailOffset = line.secondIndentOffset + m[3].length;
          line.tail = lineText.slice(line.tailOffset);
          if (key in map) {
            map[key](line);
            return;
          }
        }
        fallback(line);
      });
    };
  }

  function OriginTextFromLine(line, offset, span, interpolation) {
    var position = {
      filePath: line.position.filePath,
      line: line.position.line,
      column: 1 + offset,
    };
    return {
      origin: position,
      span: span,
      interpolation: interpolation
    };
  }

  function LinePassthrough(builder) {
    return function(line) {
      builder.addOriginScript(OriginTextFromLine(line, 0, line.text));
    };
  }
  function LineInterpolation(msgHandler, builder) {
    function findQuoteEnd(text, index, quote) {
      var re = new RegExp("[\\\\"+quote+"]", 'g');
      re.lastIndex = index;
      while((m = re.exec(text)) !== null) {
        if (m[0] == quote) return re.lastIndex;
        re.lastIndex = re.lastIndex + 1;
      }
      return text.length;
    }
    function findExpressionEnd(text) {
      var depth = 0;
      var re = /[{}"']/g, m;
      while((m = re.exec(text)) !== null) {
        switch(m[0]) {
        case '{':
          ++depth;
          break;
        case '}':
          if (0 == depth) return m.index;
          --depth;
          break;
        default: // quote
          re.lastIndex = findQuoteEnd(text, re.lastIndex, m[0]);
        }
      }
      return text.length;
    }

    return function(line) {
      builder.addIndentTargetPart(OriginTextFromLine(line, line.secondIndentOffset, line.secondIndent));
      var text = line.tail;
      var offset = line.tailOffset;
      while(true) {
        var m = text.match(/^(.*?)(?:(##)|(#{))/);
        if (!m) break;
        text = text.slice(m[1].length + 2);
        if (m[2]) {
          builder.addOriginTarget(OriginTextFromLine(line, offset, m[1]+'#'));
          offset += m[1].length + 2;
        }
        else {
          builder.addOriginTarget(OriginTextFromLine(line, offset, m[1]));
          offset += m[1].length + 2;
          var exprLength = findExpressionEnd(text);
          if (exprLength >= text.length) {
            msgHandler.templateMessage(MessageType.Error, line.position, "Missing close bracket!");
            break;
          }
          builder.addOriginScriptExpression(OriginTextFromLine(line, offset, text.slice(0, exprLength)));
          text = text.slice(exprLength + 1);
        }
      }
      builder.addOriginTarget(OriginTextFromLine(line, offset, text));
    };
  }
  function LineInterpolationWithNewline(msgHandler, builder) {
    var interpolation = LineInterpolation(msgHandler, builder);
    return function(line) {
      interpolation(line);
      builder.addTargetNewLine(OriginTextFromLine(line, line.text.length, ""));
    };
  }
  function LineIndentedScript(builder) {
    return function(line) {
      builder.pushTargetIndentation(OriginTextFromLine(line, line.secondIndentOffset, line.secondIndent));
      builder.addOriginScript(OriginTextFromLine(line, line.tailOffset, line.tail));
      builder.popTargetIndentation(OriginTextFromLine(line, line.text.length, ""));
    }
  }
  function LineCommand(map, fallback) {
    return function(line) {
      var command = { line: line };
      command.name = line.tail.split(/\s+/, 1)[0];
      command.args = line.tail.slice(command.name.length);
      if (command.name in map)
        map[command.name](command);
      else
        fallback(command);
    }
  }

  function CommandMissing(msgHandler) {
    return function(command) {
      msgHandler.templateMessage(MessageType.Error, command.line.position, "unknown command "+command.name);
    }
  }
  function CommandInclude(msgHandler, loader, processor) {
    var stack = [];
    function extractNameArg(command) {

    }
    return function(command) {
      var name = extractNameArg(command);
      if (0 === name.length) {
        // TODO
        return;
      }
      var result = loader.load(name);
      if (result.status != Loader.Success) {
        // TODO
        return;
      }
      if (stack.length >= 1000) {
        // TODO
        return;
      }
      stack.push(name);

      var line = command.line;
      builder.pushTargetIndentation(OriginTextFromLine(line, line.secondIndentOffset, line.secondIndent));
      processor(result.fullPath, result.text);
      builder.popTargetIndentation(OriginTextFromLine(line, line.text.length, ""));

      stack.pop(name);
    }
  }

  exports.PreparedTemplateBuilder =
  PreparedTemplateBuilder = function(msgHandler, loader)
  {
    var preparedScriptBuilder = PreparedScriptBuilder();
    var lineProcessor = (function(){
      var lineMap = {};
      var lineDefault = LinePassthrough(preparedScriptBuilder);
      var processor = LineProcessor(lineMap, lineDefault);
      lineMap['\\'] = LineInterpolation(msgHandler, preparedScriptBuilder);
      lineMap['|'] = LineInterpolationWithNewline(msgHandler, preparedScriptBuilder);
      lineMap['='] = LineIndentedScript(preparedScriptBuilder);
      lineMap['#'] = (function(){
        var commandMap = {};
        var commandFallback = CommandMissing(msgHandler);
        var commands = LineCommand(commandMap, commandFallback);
        commandMap['include'] = CommandInclude(msgHandler, loader, processor);
        return commands;
      })();
      return processor;
    })();

    return {
      build: function(name) {
        var result = loader.load(name);
        lineProcessor(result.fullPath, result.text);
        return preparedScriptBuilder.build();
      }
    };
  }

  function ScriptTargetBuilderApi(originPositions) {
    var sourceMapBuilder = SourceMapTextBuilder();
    var partIndent = "", indentationStack = [];

    function append(text, originIndex) {
      sourceMapBuilder.addOriginText({
        origin: originPositions[originIndex],
        span: text,
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

  exports.Engine =
  Engine = function(msgHandler, loader)
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
      var sourceMapText = templateApi.build();
      return Target(sourcMapText.sourceMap, sourcMapText.text);
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
})();
