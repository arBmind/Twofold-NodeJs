var MessageType = require('../../MessageHandler').MessageType;

module.exports = Missing;

function Missing(msgHandler) {
  return function(command) {
    msgHandler.templateMessage(MessageType.Error, command.line.position, "unknown command "+command.name);
  }
}
