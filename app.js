'use strict';
const newrelic = require('newrelic');
require('dotenv').config({
    silent: true
});
const cors = require('cors');
const helmet = require('helmet');
const express = require('express');
const logger = require('./utils/logger');
const bodyParser = require('body-parser');
const routes = require('./routers/chiaroutes');
const port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
const whiteListURL = process.env.WHITELISTURLS || 'http://localhost:3000'

const app = express();

app.use(helmet());

// Bootstrap application settings load UI from public folder
app.use(express.static('./public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

if (!process || !process.env) {
    logger.error("Not being able to read environment variables.");
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        else if (!whiteListURL.includes(origin)) {
            logger.debug(`Origin accessing the app - ${origin}`);
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        } else return callback(null, true);
    }
}));

routes(app);

app.get('/', (req, res) => {
    res.send('You are not authorized to view this page!!');
});

app.use((req, res) => {
    res.status(404).send({
        url: req.originalUrl + ' not found'
    })
});

app.listen(port);
// eslint-disable-next-line
logger.debug(`Server running on port: ${port}`);