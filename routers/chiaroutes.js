'use strict';
//const express = require('express');
//const router = express.Router();
const chia = require('../controllers/chia');
const jwt = require('jsonwebtoken');
const servicenow = require('../controllers/snowhelper');


// check header or url parameters or post parameters for token
const sNow = new servicenow();
const getUid = function (request, response, next) {
    var token = request.headers['authorization'];
    if (!token) return next();
    //token = token.replace('Bearer ', '');
    // get the decoded payload and header
    var decoded = jwt.decode(token, {
        complete: true
    });
    //decoded.payload.sub
    sNow.getUserProfile(decoded.payload.sub).then((uid) => {
        console.log(`uid--${uid}`);
        if(!uid){
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
    app.post('/api/message', getUid, function (req, res) {
        let chiaController = new chia();
        chiaController.postWatsonMessage(req).then((rest) => {
            console.log(`Watson Response...`)
            console.log(rest);
            return res.status(200).json(rest);
        }, (err) => {
            console.error(new Error(`Error Occured - ${err}`));
            return res.status(404).json(err.result.errorMessage);
        });
    });
    return app;
}

module.exports = getRouter;