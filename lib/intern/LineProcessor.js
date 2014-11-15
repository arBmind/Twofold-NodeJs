module.exports = LineProcessor;

// builds a special processor that calls a callback for each line
function LineProcessor(map, fallback)
{
  return function(name, text){
    var line = {
      position: {
        filePath: name,
        line: 0,
        column: 0
      }
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
