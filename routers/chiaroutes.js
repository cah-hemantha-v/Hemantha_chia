'use strict';
const express = require('express');
const router = express.Router();
const watson = require('../controllers/watson');

// Endpoint to be call from the client side
router.post('/', function (req, res) {
    console.log(`logging Request body -- ${req.body}`);
    watson(req.body).then((rest) => {
        return res.status(200).json(rest);
    });
});

module.exports = router;