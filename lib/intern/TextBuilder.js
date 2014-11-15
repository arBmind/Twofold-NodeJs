// An indention aware Text Builder, that keeps track where it is.

module.exports = TextBuilder;

function TextBuilder()
{
  var buffer = [],
    indentation = "",
    line = 1, column = 0;

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
        if (0 == column) column = 1 + indentation.length;
        column += text.length;
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
    column: function() { return (0 == column) ? (1 + indentation.length) : column; },
    setIndentation: function(indent) { indentation = indent; },
    addText: addText,
    addNewLine: addNewLine
  };
}
