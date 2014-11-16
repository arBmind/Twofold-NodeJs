var MessageType = { Info: 1, Warning: 2, Error: 3 };

module.exports = MessageHandler;
module.exports.MessageType = MessageType;

/* Schema:

MessageHandler = {
  message: function(MessageType, String),
  templateMessage: function(MessageType, FileLineColumnPosition, String),
  javascriptMessage: function(MessageType, [FileLineColumnPosition], String)
}

FileLineColumnPosition = {
  filePath: String,
  line: Number,
  column: Number
};
 */
function MessageHandler() {
  var TypeLabels = {1: "Info", 2: "Warning", 3: "Error"};
  return {
    message: function(type, text) {
      var typeText = TypeLabels[type] || "Unknown";
      console.log(typeText + ':', text);
    },
    templateMessage: function(type, position, text) {
      var composed = position.filePath + ':' + position.line + ' Template: ' + text;
      this.message(type, composed);
    },
    javascriptMessage: function(type, positionStack, text) {
      var lines = ["Scripting: " + text];
      for (var i = 0, l = positionStack.length; i < l; ++i) {
        var position = positionStack[i];
        lines.push("  from " + position.filePath + ':' + position.line + '[' + position.column + ']');
      }
      this.message(type, lines.join('\n'));
    }
  };
}
