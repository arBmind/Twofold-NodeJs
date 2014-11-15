
module.exports = Command;

function Command(map, fallback)
{
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
