const glideRecord = require('./gliderecord');
const logger = require('../utils/logger');

module.exports = class ServiceNow {
    constructor() {}

    static getUserProfile(email) {
        logger.debug(`email--${email}`);
        return new Promise((resolve, reject) => {
            var grUser = new glideRecord('sys_user');
            grUser.setReturnFields('user_name,u_nickname');
            grUser.addEncodedQuery(`email=${email}`);
            grUser.setLimit(1);
            grUser.query().then(function (result) {
                if (result.length > 0) {
                    logger.debug(result);
                    resolve(result[0].user_name);
                } else {
                    logger.debug('err - ' + result);
                    reject(result);
                }
            }).catch((err) => {
                logger.error(`Not able to fetch user properties`);
                logger.error(err);
                reject(err);
            });
        });
    }
}