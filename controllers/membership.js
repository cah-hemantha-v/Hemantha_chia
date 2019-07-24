const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class Membership {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
    }

    handleError(error, errorType) {
        return new Promise((resolve, reject) => {
            this.watson.setContext(errorType, error.errorMessage);
            this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                resolve(rest);
            });
        })
    }

    checkSoldTo() {
        logger.debug("inside membership check SoldTo method");
        return new Promise((resolve, reject) => {
            this.watson.setContext("MembershipCheckSoldto", false);
            const sold_to = this.watson.getContext("soldto");
            this.iprice.checkSoldToCustomer(sold_to).then((soldtoResponse) => {
                if (soldtoResponse.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    this.watson.setContext("soldtoerr", false);
                    this.watson.setContext("customer_name", soldtoResponse.result.customerName);
                    this.watson.setContext('customer_details', soldtoResponse.result);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                } else if (soldtoResponse.statusCode == 404) {
                    this.handleError(soldtoResponse.result, 'soldtoerr').then(data => {
                        resolve(data);
                    })
                }
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
            this.iprice.checkMaterialNum(cah_material).then((materialResponse) => {
                if (materialResponse.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    const vendor_name = materialResponse.result.vendorName;
                    const material_description = materialResponse.result.materialDescription;
                    this.watson.setContext("material_return", `<div>Here is the material information for the Material Number you entered:</div><div><b>Vendor Name:</b> ${vendor_name}</div><div><b>Material Description:</b> ${material_description}</div>`);
                    this.checkMembershipAgreement().then(data => {
                        resolve(data);
                    })
                } else if (materialResponse.statusCode == 404) {
                    this.handleError(materialResponse.result, 'matNumErr').then(data => {
                        resolve(data);
                    })
                }
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
            this.iprice.checkMembershipAgreement(soldto, cah_material).then((membershipResponse) => {
                if (membershipResponse.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    this.watson.response.output.text[0] = this.watson.getContext("material_return");
                    if (!this.primaryAgreement(membershipResponse.result)) {
                        this.watson.request.output.text[1] = `Item is not currently accessing a primary agreement ie non-contracted`
                    } else {
                        for (let i = 0; i < membershipResponse.result.length; i++) {
                            if (membershipResponse.result[i].primaryAgreement) {
                                let tierResponse = '';
                                this.watson.response.output.text.push(`Winning price for soldto ${soldto} and material ${cah_material} comes from ${membershipResponse.result[i].agreementCategoryTypeDesc} contract ${membershipResponse.result[i].agreementDescription}-${membershipResponse.result[i].agreementExternalDescription} ${tierResponse} and is valid from ${membershipResponse.result[i].agreementMaterialValidFromDateDisplay} to ${membershipResponse.result[i].agreementMaterialValidToDateDisplay}`);
                            } else {
                                this.watson.response.output.text.push(`<div>This customer material combination is also eligible on the following contracts:</div>
                            <div>${membershipResponse.result[i].agreementNumber}</div>
                            <div>${membershipResponse.result[i].agreementDescription}</div>
                            <div>${membershipResponse.result[i].agreementExternalDescription}</div>
                            <div>${membershipResponse.result[i].rateDisplay}</div>`);
                            }
                        }
                    }
                    this.watson.setContext('material_processed',true);
                    this.watson.response.output.text.push(`Would you like to check another membership request?`);
                    this.watson.response.output.chiapayload = [{
                        "type":"button",
                        "values":["Yes","No"]
                    }]
                    resolve(this.watson.response);
                } else if (membershipResponse.statusCode == 404) {
                    this.handleError(membershipResponse.result, 'no_agreement').then(data => {
                        resolve(data);
                    });
                }
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