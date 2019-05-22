'use strict';
const chia = require('../controllers/chia');
const jwt = require('jsonwebtoken');
const okta = require('../controllers/okta');


// check header or url parameters or post parameters for token
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
    app.post('/api/message', getUid, function (req, res) {
        let chiaController = new chia();
        chiaController.postWatsonMessage(req).then((rest) => {
            // console.log(`Watson Response...`)
            // console.log(rest);
            return res.status(200).json(rest);
        }, (err) => {
            console.error(new Error(`Error Occured - ${err}`));
            return res.status(404).json(err.result.errorMessage);
        });
    });
    return app;
}

module.exports = getRouter;