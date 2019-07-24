'use strict';
const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');
const pricing = require('./pricing');
const ServiceNow = require('./snowhelper');
const membership = require('./membership');
const reports = require('./reports');
const creditrebills = require('./creditrebills');

module.exports = class ChiaController {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
        this.pricing = new pricing();
        this.membership = new membership();
        this.reports = new reports();
        this.creditrebills = new creditrebills();
    }

    setIpriceUid(uid) {
        this.iprice.setUid(uid);
        this.pricing.iprice.setUid(uid);
        this.membership.iprice.setUid(uid);
        this.reports.iprice.setUid(uid);
    }

    setWatsonResponse(response) {
        this.watson.setResponse(response);
        this.pricing.watson.setResponse(response);
        this.membership.watson.setResponse(response);
        this.reports.watson.setResponse(response);
        this.creditrebills.watson.setResponse(response);
    }

    updateConversationLog(uid) {
        return new Promise((resolve, reject) => {
            logger.debug("Inside updateConversationLog() function.");
            ServiceNow.getUserProfile(uid).then((result) => {
                logger.debug("sys_id = " + result[0].sys_id);
                let sn = this.watson.getContext('sn');
                sn.user.sys_id = result[0].sys_id;
                this.watson.setContext("sn", sn);
                this.watson.setContext('sys_id_updated', true);
                resolve(this.apiRoutes(uid));
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        })
    }

    apiRoutes(uid) {
        let subProposal = this.watson.getContext('submitproposal');
        if(subProposal){logger.info(`ProposalID-${subProposal.proposalId}`);}
        logger.debug("1. Inside apiRoutes() method.");
        if (this.watson.getContext("CheckSoldto")) return (this.pricing.checkSoldTo());
        else if (this.watson.getContext("MembershipCheckSoldto")) return (this.membership.checkSoldTo());
        else if (this.watson.getContext("MembershipCheckMaterial")) return (this.membership.checkMaterial());
        else if (this.watson.getContext("CheckMaterial")) return (this.pricing.checkMaterial());
        else if (this.watson.getContext("Get_PriceQuote")) return (this.pricing.getPriceQuote());
        else if (this.watson.getContext("Check_Proposal")) return (this.pricing.checkProposal());
        else if (this.watson.getContext("Check_Governance")) return (this.pricing.checkGovernance());
        else if (this.watson.getContext("Delete_Proposal")) return (this.pricing.deleteProposal(this.watson.getContext('deleteObj')));
        else if (this.watson.getContext("Submit_Proposal")) return (this.pricing.submitProposal());
        else if (this.watson.getContext("Check_PriceBook")) return (this.reports.checkPriceBook());
        else if (this.watson.getContext("Submit_PriceBook")) return (this.reports.submitPriceBookRequest());
        else if (this.watson.getContext("checkServiceIssue")) return (this.creditrebills.checkServiceIssue());
        else if (this.watson.getContext("checkInvoiceNumber")) return (this.creditrebills.checkInvoiceNumber());
        else if (this.watson.getContext("checkMaterial")) return (this.creditrebills.checkMaterialNumber());
        else if (this.watson.getContext("checkLastTenSoldTo")) return (this.creditrebills.checkLastTenSoldTo());
        else if (this.watson.getContext("Submit_Report")) return (this.reports.submitReportRequest(uid));
        else return (this.watson.response);
    }

    postWatsonMessage(request) {
        return new Promise((resolve, reject) => {
            this.watson.setRequest(request);
            const uid = this.watson.request.login_uid;
            this.setIpriceUid(uid);
            this.watson.watsonPostMessage(request.body).then((watsonResponse) => {
                this.setWatsonResponse(watsonResponse);
                if (!this.watson.getContext("sys_id_updated")) resolve(this.updateConversationLog(uid));
                else resolve(this.apiRoutes(uid));
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        });
    }
}
