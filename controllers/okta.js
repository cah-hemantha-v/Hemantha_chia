'use strict';
const request = require("request");
const logger = require("../utils/logger");

module.exports = class Okta {
    constructor(host, token) {
        this.url = 'https://' + host + '/oauth2/v1'
        this.header = {
            'content-type': 'application/x-www-form-urlencoded',
            'Host': host,
            'Cache-Control': 'no-cache',
            'Accept': '*/*',
            'Authorization': token
        }
    }

    getUserInfo() {
        const options = {
            method: 'GET',
            url: this.url + '/userinfo',
            headers: this.header
        };

        return new Promise((resolve, reject) => {
            request(options, function (error, response, body) {
                try {
                    if (!error) {
                        logger.debug(body);
                        resolve(body);
                    } else {
                        logger.error(`Error with Okta user info`);
                        logger.error(error);
                        reject(error);
                    }
                } catch (error) {
                    logger.error(error);
                    reject(error);
                }
            });
        });
    }
}