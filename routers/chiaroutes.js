'use strict';
const chia = require('../controllers/chia');
const okta = require('../controllers/okta');
const logger = require('../utils/logger');

const getUid = function (request, response, next) {
    let token = request.headers['authorization'];
    let chiaOutput = {
        output: {
            text: ['You are not authorized to access this application. Please create a request in ServiceNow for access.']
        }
    }
    if (!token) {
        return response.status(200).json(chiaOutput);
    } else {
        okta(process.env.OKTA_HOST, token).then((body) => {
            let oktaResponse = JSON.parse(body);
            request.login_uid = oktaResponse.uid;
            next();
        }).catch((err) => {
            console.error(new Error(err));
            return response.status(200).json(chiaOutput);
        });
    }
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