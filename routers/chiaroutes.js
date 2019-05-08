'use strict';
const express = require('express');
const router = express.Router();
const chia = require('../controllers/chia');

// Endpoint to be call from the client side
router.post('/', function (req, res) {
    let chiaController = new chia();
    chiaController.postWatsonMessage(req.body).then((rest) => {
          console.log(`Watson Response...`)
          console.log(JSON.stringify(rest, null, 2));
        return res.status(200).json(rest);
    }, (err) => {
        console.error(new Error(`Error Occured - ${err}`));
        return res.status(404).json(err.result.errorMessage);
    });
});

module.exports = router;