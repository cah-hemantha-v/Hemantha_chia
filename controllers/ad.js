'use strict';
const DateConverter = require('./date');
const logger = require('../utils/logger');
const ActiveDirectory = require('activedirectory');

module.exports = class AD {
    constructor() {
        this._server = process.env.AD_SERVER_URL;
        this._username = process.env.AD_USERNAME;
        this._password = process.env.AD_PASSWORD;
        this._url = `ldap://${this._server}`;
        this.statuses = {
            normal_account: 512,
            locked: 16,
            disabled: 514,
            expired: 8388608
        };
    }

    createConfig() {
        return {
            url: this._url,
            baseDN: 'dc=cardinalhealth,dc=net',
            username: `${this._username}@cardinalhealth.com`,
            password: this._password,
        };
    }

    statusLookup(status_code) {
        return this.statuses[status_code];
    }

    getFlags(ad_user_data) {
        const date = new DateConverter(ad_user_data.pwdLastSet);
        const user_account_status = ad_user_data.userAccountControl;
        let flags = [];
        if (date.updatedInPast24Hours()) flags.push("24-hours");
        if (this.statuses.locked == user_account_status) flags.push("locked");
        if (this.statuses.expired == user_account_status) flags.push("expired");
        if (this.statuses.disabled == user_account_status) flags.push("disabled");
        return flags;
    }

    findUser(username) {
        return new Promise((resolve, reject) => {
            const config = this.createConfig();
            const ad = new ActiveDirectory(config);
            ad.findUser(username, (err, user) => {
                if (err) reject(`ERROR: ${JSON.stringify(err, null, 2)}`);
                else(user) ? resolve(user) : reject(`User: ${username} not found.`);
            });
        })
    }
}