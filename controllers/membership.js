const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class Membership {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
    }

    checkSoldTo() {
        logger.debug("inside membership check SoldTo method");
        return new Promise((resolve, reject) => {
            this.watson.setContext("MembershipCheckSoldto", false);
            const sold_to = this.watson.getContext("soldto");
            this.iprice.checkSoldToCustomer(sold_to).then((soldToBody) => {
                this.watson.setContext("counter", 0);
                this.watson.setContext("soldtoerr", false);
                this.watson.setContext("customer_name", soldToBody.result.customerName);
                this.watson.response.output.text[0] = `<div>Here is the customer you have entered:</div><div> Customer: <b>${soldToBody.result.customerName}</b> - <b>${sold_to}</b></div>`
                this.watson.response.output.text[1] = `What is the CAH Material for which you would like to get the eligibility details?`;
                resolve(this.watson.response);
            }).catch((err) => {
                this.watson.setContext("soldtoerr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    logger.error(this.watson.response);
                    resolve(rest);
                });
            });
        })
    }

    checkMaterial() {
        logger.debug(`inside check material method`);
        return new Promise((resolve, reject) => {
            this.watson.setContext("MembershipCheckMaterial", false);
            this.watson.setContext("matNumErr", false);
            const cah_material = this.watson.getContext("cah_material");
            this.iprice.checkMaterialNum(cah_material).then((matNumBody) => {
                this.watson.setContext("counter", 0);
                const vendor_name = matNumBody.vendorName;
                const material_description = matNumBody.materialDescription;
                this.watson.setContext("material_return", `<div>Here is the material information for the Material Number you entered:</div><div><b>Vendor Name:</b> ${vendor_name}</div><div><b>Material Description:</b> ${material_description}</div>`);
                return this.watson.response;
            }).then(() => {
                resolve(this.checkMembershipAgreement());
            }).catch((err) => {
                const error_message = `${this.watson.response.context.cah_material} is an ${err.result.errorMessage}`;
                this.watson.setContext('matNumErr', error_message);
                logger.error(this.watson.response);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        })
    }

    primaryAgreement(agreements) {
        logger.warn(agreements);
        for (let i = 0; i < agreements.length; i++) {
            if (agreements[i].primaryAgreement) {
                logger.warn("returning true");
                return true;
            }
        }
        logger.warn("returning false");
        return false;
    }

    checkMembershipAgreement() {
        logger.debug(`inside check membership agreement method`);
        return new Promise((resolve, reject) => {
            this.watson.setContext("CheckMaterial", false);
            this.watson.setContext("matNumErr", false);
            const cah_material = this.watson.getContext("cah_material");
            const soldto = this.watson.getContext("soldto");
            this.iprice.checkMembershipAgreement(soldto, cah_material).then((response) => {
                this.watson.setContext("counter", 0);
                this.watson.response.output.text[0] = this.watson.getContext("material_return")
                if (!this.primaryAgreement(response)) {
                    this.watson.request.output.text[1] = `Item is not currently accessing a primary agreement ie non-contracted`
                } else {
                    for (let i = 0; i < response.length; i++) {
                        if (response[i].primaryAgreement) {
                            let tierResponse = '';
                            // if (agreements[i].agreementCategoryType == 'AG' || agreements[i].agreementCategoryType == 'GR') {
                            //     tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} tier ${pq.result.costTierNum} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`;
                            // } else if (agreements[i].agreementCategoryType == 'LC') {
                            //     tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`;
                            // } else if (agreements[i].agreementCategoryType == 'BL') {
                            //     tierResponse = `This price comes from Cardinal local pricing`
                            // } else if (agreements[i].agreementCategoryType == 'GM') {
                            //     tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.distAgreementExtDesc} and is valid from ${pq.result.currentPriceValidityFromDate} to ${pq.result.currentPriceValidityToDate}.`;
                            // } else { //NC
                            //     tierResponse = `This price comes from Cardinal local pricing`
                            // }
                            this.watson.response.output.text.push(`Winning price for soldto ${soldto} and material ${cah_material} comes from ${response[i].agreementCategoryTypeDesc} contract ${response[i].agreementDescription}-${response[i].agreementExternalDescription} ${tierResponse} and is valid from ${response[i].agreementMaterialValidFromDateDisplay} to ${response[i].agreementMaterialValidToDateDisplay}`);
                        } else {
                            this.watson.response.output.text.push(`<div>This customer material combination is also eligible on the following contracts:</div>
                            <div>${response[i].agreementNumber}</div>
                            <div>${response[i].agreementDescription}</div>
                            <div>${response[i].agreementExternalDescription}</div>
                            <div>${response[i].rateDisplay}</div>`);
                        }
                    }
                }
                this.watson.response.output.text.push(`Would you like to check another membership request?`);
                resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                if (err.result.errorMessage) {
                    this.watson.response.context.no_agreement = `${err.result.errorMessage}`;
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                } else {
                    this.watson.response.context.matNumErr = `${this.watson.response.context.cah_material} is an ${err}`;
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                }
            });
        })
    }
}