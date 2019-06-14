'use strict';
const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');
const pricing = require('./pricing');
const ServiceNow = require('./snowhelper');
const membership = require('./membership');

module.exports = class ChiaController {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
        this.pricing = new pricing();
        this.membership = new membership();
    }

    setIpriceUid(uid) {
        this.iprice.setUid(uid);
        this.pricing.iprice.setUid(uid);
        this.membership.iprice.setUid(uid);
    }

    setWatsonResponse(response) {
        this.watson.setResponse(response);
        this.pricing.watson.setResponse(response);
        this.membership.watson.setResponse(response);
    }

    updateConversationLog(uid) {
        return new Promise((resolve, reject) => {
            logger.debug("inside update conversation main");
            ServiceNow.getUserProfile(uid).then((sys_id) => {
                logger.debug("sys_id = " + sys_id);
                this.watson.setContext("sys_id", sys_id);
                resolve(this.apiRoutes());
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        })
    }

    apiRoutes() {
        logger.debug("inside api routes");
        if (this.watson.getContext("CheckSoldto")) return (this.pricing.checkSoldTo());
        else if (this.watson.getContext("MembershipCheckSoldto")) return (this.membership.checkSoldTo());
        else if (this.watson.getContext("MembershipCheckMaterial")) return (this.membership.checkMaterial());
        else if (this.watson.getContext("CheckMaterial")) return (this.pricing.checkMaterial());
        else if (this.watson.getContext("getPriceQuote")) return (this.pricing.getPriceQuote());
        else if (this.watson.getContext("Check_Proposal")) return (this.pricing.checkProposal());
        else if (this.watson.getContext("Check_Governance")) resolve (this.pricing.checkGovernance());
        else if (this.watson.getContext("Delete_Proposal")) resolve(this.pricing.deleteProposal(this.watson.getContext('proposalId')));
        else return (this.watson.response);
    }

    postWatsonMessage(request) {
        return new Promise((resolve, reject) => {
            this.watson.setRequest(request);
            const uid = this.watson.request.login_uid;
            this.setIpriceUid(uid);
            this.watson.watsonPostMessage(request.body).then((watsonResponse) => {
                this.setWatsonResponse(watsonResponse);
                if (!this.watson.getContext("sys_id")) resolve(this.updateConversationLog(uid));
                else resolve(this.apiRoutes());
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        });
    }    
}