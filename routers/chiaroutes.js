'use strict';
const chia = require('../controllers/chia');
const jwt = require('jsonwebtoken');
const servicenow = require('../controllers/snowhelper');
const logger = require('../utils/logger');

const sNow = new servicenow();
const getUid = (request, response, next) => {
    var token = request.headers['authorization'];
    if (!token) return next();
    //token = token.replace('Bearer ', '');
    // get the decoded payload and header
    var decoded = jwt.decode(token, {
        complete: true
    });
    //decoded.payload.sub
    sNow.getUserProfile(decoded.payload.sub).then((uid) => {
        logger.debug(`uid--${uid}`);
        if (!uid) {
            response.status(401).send({
                "success": false,
                "error": "An authorization header is required"
            });
        }
        request.login_uid = uid;
    });
    next();
}

// Endpoint to be call from the client side
function getRouter(app) {
    app.get('/', (req, res) => {
        res.send('You are not authorized to view this page!!');
    });

    app.post('/api/message', getUid, (req, res) => {
        let chiaController = new chia();
        chiaController.postWatsonMessage(req).then((rest) => {
            const message = rest ? "message was returned" : "mo message included";
            logger.debug(message)
            logger.info(`-------------`);
            return res.status(200).json(rest);
        }).catch((err) => {
            logger.error(err);
            logger.error(`-------------`);
            return res.status(404).json(err);
        });
    });
    return app;
}

module.exports = getRouter;