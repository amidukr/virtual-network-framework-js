const path = require('path');

module.exports = {
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'amid-ukr-vnf.js',
    library: "Vnf"
  }
};