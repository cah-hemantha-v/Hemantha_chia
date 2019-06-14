'use strict';
const logger = require('../utils/logger');
const chia = require('../controllers/chia');
const Okta = require('../controllers/okta');
const SnowLogger = require('../controllers/snowlogger');

function getUid(request, response, next) {
    const token = request.headers['authorization'];
    const chiaOutput = {
        output: {
            text: ['Your session has expired. Please refresh the window to login again.']
        }
    }
    if (!token)  return response.status(200).json(chiaOutput);
    else {
        new Okta(process.env.OKTA_HOST, token).getUserInfo().then((body) => {
            logger.debug(body);
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
        let snowlogger = new SnowLogger();
        chiaController.postWatsonMessage(req).then((rest) => {
            try {
                snowlogger.createConversationLog(rest);
            } catch (err) {
                logger.error(err);
            }
            const message = rest ? "message was returned" : "mo message included";
            logger.info('final response to end user..');
            logger.info(rest);
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