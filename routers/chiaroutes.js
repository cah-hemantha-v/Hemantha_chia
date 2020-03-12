'use strict';
const logger = require('../utils/logger');
const chia = require('../controllers/chia');
const Okta = require('../controllers/okta');
const SnowLogger = require('../controllers/snowlogger');

function getUid(request, response, next) {
    const token = request.headers['authorization'];
    // console.log(request.headers['authorization']);      //  
    const chiaOutput = {
        output: {
            text: ['Your session has expired. Please refresh the page to login again.']
        }
    }
    if (!token) return response.status(200).json(chiaOutput);
    else {
        new Okta(process.env.OKTA_HOST, token).getUserInfo().then((body) => {
            let oktaResponse = JSON.parse(body);
            // console.log(oktaResponse);     //
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

// function validateToken(request, response, next) {
//     const authHeader = request.headers.jwttoken;
//     console.log('JWT token is: ', authHeader);
//     if (authHeader) {
//         jwt.verify(authHeader, process.env.CHIA_JWT_SIGNATURE, function (error, decodedToken) {
//             if (error) {
//                 return response.status(401).send({
//                     "success": false,
//                     "error": "Invalid authorization token"
//                 });
//             }
//             next();
//         });
//     } else {
//         response.status(401).send({
//             "success": false,
//             "error": "An auth token is required "
//         });
//     }
//};


module.exports = function getRouter(app) {
    app.get('/', (req, res) => {
        res.send('You are not authorized to view this page!!');
    });

    app.post('/message', getUid, (req, res) => {
        let chiaController = new chia();
        let snowlogger = new SnowLogger();
        console.log(req);   //
        console.log(req.login_uid);     //
        chiaController.postWatsonMessage(req).then((rest) => {
            try {
                snowlogger.createConversationLog(rest);
            } catch (err) {
                logger.error(err);
            }
            const message = rest ? "message was returned" : "mo message included";
            logger.debug('final context to end user..');
            logger.debug(rest.context);
            logger.debug(`-------------`);
            return res.status(200).json(rest);
        }).catch((err) => {
            logger.error(err);
            logger.error(`-------------`);
            return res.status(200).json(err);
        });
    });
    return app;
}