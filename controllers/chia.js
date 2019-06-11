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
            this.setIpriceUid();
            this.watson.watsonPostMessage(request.body).then((watsonResponse) => {
                this.setWatsonResponse(watsonResponse);
                if (this.watson.getContext("CheckSoldto")) resolve(this.pricing.checkSoldTo());
                else if (this.watson.getContext("MembershipCheckSoldto")) resolve(this.membership.checkSoldTo());
                else if (this.watson.getContext("MembershipCheckMaterial")) resolve(this.membership.checkMaterial());
                else if (this.watson.getContext("CheckMaterial")) resolve(this.pricing.checkMaterial());
                else if (this.watson.getContext("getPriceQuote")) resolve(this.pricing.getPriceQuote());
                else if (this.watson.getContext("Check_Proposal")) resolve(this.pricing.checkProposal());
                else resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        });
    }

    setIpriceUid() {
        this.iprice.setUid(this.watson.request.login_uid);
        this.pricing.iprice.setUid(this.watson.request.login_uid);
        this.membership.iprice.setUid(this.watson.request.login_uid);
    }

    setWatsonResponse(response) {
        this.watson.setResponse(response);
        this.pricing.watson.setResponse(response);
        this.membership.watson.setResponse(response);
    }
}