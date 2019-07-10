const glideRecord = require('./gliderecord');
const logger = require('../utils/logger');

module.exports = class ServiceNow {
    constructor() {}

    static getUserProfile(uid) {
        console.log(`UID - ${uid}`)
        logger.debug("get user profile")
        return new Promise((resolve, reject) => {
            const grUser = new glideRecord('sys_user');
            grUser.setReturnFields('sys_id, email');
            grUser.addEncodedQuery(`user_name=${uid}`);
            grUser.setLimit(1);
            grUser.query().then(function (result) {
                if (result.length > 0) {
                    logger.debug(result);
                    resolve(result);
                } else {
                    logger.error(`Not able to fetch user properties, adding BOT ID for logging`);
                    logger.error(result);
                    resolve(process.env.CHIA_SYSID);
                }
            }).catch((err) => {
                logger.error(`Not able to fetch user properties`);
                logger.error(err);
                reject(err);
            });
        });
    }
}