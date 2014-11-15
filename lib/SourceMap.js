var bounds = require("binary-search-bounds");

var Interpolation = { None: undefined, OneToOne: 1 };
module.exports.Interpolation = Interpolation;

/* Schema:

Entry = {
  origin: FileLineColumnPosition,
  generatedLine: Number,
  generatedColumn: Number,
  interpolation: Interpolation,
  callerIndex: Number
}

Caller = {
  origin: FileLineColumnPosition,
  parentIndex: Number
}

*/

/* SourceMap with callers */
module.exports.SourceMap = function(entries, callers)
{
  function compare(generatedLine1, generatedColumn1, generatedLine2, generatedColumn2) {
    var lineDiff = generatedLine1 - generatedLine2;
    if (0 != lineDiff) return lineDiff;

    var columnDiff = generatedColumn1 - generatedColumn2;
    return columnDiff;
  }

  var generatedSorted = entries.slice().sort(function(a, b){
    return compare(a.generatedLine, a.generatedColumn, b.generatedLine, b.generatedColumn);
  });

  function fileNames() {
    var result = [];
    for(var i = 0, l = entries.length; i < l; i++) {
      var name = entries[i].origin.filePath;
      if (-1 == result.indexOf(name)) result.push(name);
    }
    return result;
  }
  function findBlock(generatedLine, generatedColumn) {
    var idx = bounds.le(generatedSorted, null, function(entry) {
      return compare(entry.generatedLine, entry.generatedColumn, generatedLine, generatedColumn);
    });
    return generatedSorted[idx];
  }
  function findPosition(generatedLine, generatedColumn) {
    var entry = findBlock(generatedLine, generatedColumn);
    if (null == entry) return { filePath: '',  line: 0,  column: 0 };
    if (entry.interpolation == Interpolation.None) return entry.origin;

    var line = (generatedLine - entry.generatedLine) + entry.origin.line;
    var column = generatedColumn;
    if (line == entry.origin.line) {
      column = (generatedColumn - entry.generatedColumn) + entry.origin.column;
    }
    return { filePath: entry.origin.filePath, line: line, column: column };
  }
  function callerStack(entry) {
    var stack = [];
    if (null == entry) return stack;
    var index = entry.callerIndex;
    while (-1 != index) {
      stack.push(callers[index]);
      index = callers[index].parentIndex;
    }
    return stack;
  }

  return {
    fileNames: fileNames,
    findBlock: findBlock,
    findPosition: findPosition,
    callerStack: callerStack
  };
};
