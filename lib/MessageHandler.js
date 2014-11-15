
module.exports.MessageType = { Info: 1, Warning: 2, Error: 3 };

/* Schema:

  MesageHandler = {
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
