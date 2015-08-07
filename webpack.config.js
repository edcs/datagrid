var path = require("path");

module.exports = {
  entry: "./src/datagrid.js",
  output: {
    filename: "datagrid.min.js"
  },
	module: {
		loaders: [{ test: /\.handlebars$/, loader: "handlebars-loader" }]
	}
};
