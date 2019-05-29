'use strict';
const chia = require('../controllers/chia');
const Okta = require('../controllers/okta');
const logger = require('../utils/logger');

function getUid(request, response, next) {
    const token = request.headers['authorization'];
    const chiaOutput = {
        output: {
            text: ['Your session has expired. Please refresh the window to login again.']
        }
    }
    if (!token) return response.status(200).json(chiaOutput);
    else {
        new Okta(process.env.OKTA_HOST, token).getUserInfo().then((body) => {
            let oktaResponse = JSON.parse(body);
            if (oktaResponse.uid) {
                request.login_uid = oktaResponse.uid;
            } else {
                logger.error(`UID Not available.`);
                return response.status(200).json(chiaOutput);
            }
            next();
        }).catch((err) => {
            console.error(new Error(err));
            return response.status(200).json(chiaOutput);
        });
    }
}

module.exports = function getRouter(app) {
    app.get('/', (req, res) => {
        res.send('You are not authorized to view this page!!');
    });

    app.post('/api/message', getUid, (req, res) => {
        let chiaController = new chia();
        chiaController.postWatsonMessage(req).then((rest) => {
            const message = rest ? "message was returned" : "mo message included";
            logger.debug(message);
            logger.info(`-------------`);
            return res.status(200).json(rest);
        }).catch((err) => {
            logger.error(err);
            logger.error(`-------------`);
            return res.status(200).json(err);
        });
    });
    return app;
}