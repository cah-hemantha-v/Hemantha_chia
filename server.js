'use strict';
require('dotenv').config({silent: true});

const server = require('./app');
const port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
server.listen(port, function() {
  // eslint-disable-next-line
  console.log('Server running on port: %d', port);
});