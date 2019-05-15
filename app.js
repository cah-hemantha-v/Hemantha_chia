'use strict';
const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const cors = require('cors');
const helmet = require('helmet');
const whiteListURL = process.env.WHITELISTURLS || 'http://localhost:3000'
const routes = require('./routers/chiaroutes');


const app = express();
app.use(helmet());

// Bootstrap application settings load UI from public folder
app.use(express.static('./public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

if (process === null || process.env === null) {
  console.log("Not being able to read environment variables.");
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin)
      return callback(null, true);
    if (whiteListURL.indexOf(origin) === -1) {
      console.log(`Origin accessing the app - ${origin}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));


routes(app);

app.get('/', function (req, res) {
  res.send('You are not authorized to view this page!!');
});


//app.use('/api/message', routes);

module.exports = app;