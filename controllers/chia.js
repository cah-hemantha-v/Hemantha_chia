'use strict';

const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');
const pricing = require('./pricing');
const membership = require('./membership');

module.exports = class ChiaController {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
        this.pricing = new pricing();
        this.membership = new membership();
    }

    postWatsonMessage(request) {
        logger.debug(`watson input`);
        return new Promise((resolve, reject) => {
            this.watson.setRequest(request);
            this.iprice.setUid(this.watson.request.login_uid);
            this.watson.watsonPostMessage(request.body).then((watsonResponse) => {
                this.watson.setResponse(watsonResponse);
                if (this.watson.getContext("CheckSoldto")) resolve(this.pricing.checkSoldTo());
                else if (this.watson.getContext("MembershipCheckSoldto")) resolve(this.membership.membershipCheckSoldTo());
                else if (this.watson.getContext("MembershipCheckMaterial")) resolve(this.membership.membershipCheckMaterial());
                else if (this.watson.getContext("CheckMaterial")) resolve(this.pricing.CheckMaterial());
                else if (this.watson.getContext("getPriceQuote")) resolve(this.pricing.getPriceQuote());
                else if (this.watson.getContext("Check_Proposal")) resolve(this.pricing.checkProposal());
                else resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        });
    }
}