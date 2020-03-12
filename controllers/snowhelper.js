const glideRecord = require('./gliderecord');
const logger = require('../utils/logger');

module.exports = class ServiceNow {
    constructor() {}

    static getUserProfile(uid) {
        logger.debug(`get user profile - ${uid}`)
        return new Promise((resolve, reject) => {
            const grUser = new glideRecord('sys_user');     //Glide record- query, insert, update, delete the data from a specified table in Snow. It executes on server side  //  table-name 'sys_user'
            grUser.setReturnFields('sys_id, email');
            grUser.addEncodedQuery(`user_name=${uid}^active=true`);     //addEncodedQuery() can filter the record based upon the multiple fileds  //addQuery can filter based upon only one field
            grUser.setLimit(1);
            grUser.query().then(function (result) {
                if (result.length > 0) {
                    logger.info('Return response from user profile query.')
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