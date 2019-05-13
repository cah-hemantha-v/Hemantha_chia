const glideRecord = require('./gliderecord');

class ServiceNow {
    constructor() {
        this.snowInstance = process.env.SNOW_INSTANCE || 'cardinalsand';
        this.snowUid = process.env.SNOW_UID || 'chia.bot';
        this.snowPwd = process.env.SNOW_PWD || 'J0hnny5';
    }

    //Method to retreive User details from Sys User table in ServiceNow
    getUserProfile(email) {
        console.log(`email--${email}`);
        return new Promise((resolve, reject) => {
            var grUser = new glideRecord(this.snowInstance, 'sys_user', this.snowUid, this.snowPwd);
            grUser.setReturnFields('user_name,u_nickname');
            grUser.addEncodedQuery(`email=${email}`);
            grUser.setLimit(1);
            grUser
                .query()
                .then(function (result) {
                    if (result.length > 0) {
                        console.log(result);
                        resolve(result[0].user_name);
                    } else {
                        console.log('err - '+ result);
                        resolve('kararu01');
                    }
                })
                .catch((err) => {
                    console.error(new Error(`Not able to fetch user properties - ${err}`));
                    reject(err);
                });
        });
    }
}

module.exports = ServiceNow;