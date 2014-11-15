
module.exports.Status = { Success: 1, NotFound: 2, ErrorLoading: 3 };

/* Schema:

TextLoader = {
  load: function(name) -> Result
}
Result = {
  status: Status,
  name: String,
  text: String
};

 */
