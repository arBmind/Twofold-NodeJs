var fs = require('fs');
var Path = require('path');
var Status = require('./TextLoader').Status;

module.exports = PathTextFileLoader;

function PathTextFileLoader()
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
        return { status: Status.Success, fullPath: fullPath, text: text };
      }
      catch(e) {
        found = true;
      }
    }
    return {
      status: found ? Status.ErrorLoading : NotFound,
      fullPath: "",
      text: ""
    };
  }

  return {
    load: load,
    addPath: function(path) { pathes.push(path); }
  }
}
