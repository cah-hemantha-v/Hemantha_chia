'use strict';

const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class ChiaController {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
    }

    membershipCheckSoldTo() {
        logger.debug("inside membership check SoldTo method");
        return new Promise((resolve, reject) => {
            this.watson.setContext("MembershipCheckSoldto", false);
            const sold_to = this.watson.getContext("soldto");

            this.iprice.checkSoldToCustomer(sold_to).then((soldToBody) => {
                this.watson.setContext("counter", 0);
                this.watson.setContext("soldtoerr", false);

                const customer = JSON.parse(soldToBody);

                this.watson.setContext("customer_name", customer.result.customerName);
                this.watson.response.output.text[0] = `<div>Here is the customer you have entered:</div><div> Customer: <b>${customer.result.customerName}</b> - <b>${sold_to}</b></div>`
                this.watson.response.output.text[1] = `What is the CAH Material for which you would like to get the eligibility details?`;
                resolve(this.watson.response);
            }).catch((err) => {
                logger.error(JSON.parse(err));
                this.watson.setContext("soldtoerr", JSON.parse(err).result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    logger.error(this.watson.response);
                    reject(rest);
                });
            });
        })
    }

    membershipCheckMaterial() {
        logger.debug(`inside check material method`);
        return new Promise((resolve, reject) => {
            this.watson.setContext("MembershipCheckMaterial", false);
            this.watson.setContext("matNumErr", false);

            const cah_material = this.watson.getContext("cah_material");

            this.iprice.checkMaterialNum(cah_material).then((matNumBody) => {
                this.watson.setContext("counter", 0);
                const response = JSON.parse(matNumBody).result;
                const vendor_name = response.vendorName;
                const material_description = response.materialDescription;
                this.watson.setContext("material_return", `<div>Here is the material information for the Material Number you entered:</div><div><b>Vendor Name:</b> ${vendor_name}</div><div><b>Material Description:</b> ${material_description}</div>`);
                return this.watson.response;
            }).then((data) => {
                resolve(this.checkMembershipAgreement());
            }).catch((err) => {
                logger.error(err);
                const error_message = `${this.watson.response.context.cah_material} is an ${err.result.errorMessage}`;
                this.watson.setContext('matNumErr', error_message);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    reject(rest);
                });
            });
        })
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
                const agreement = JSON.parse(response).result[0];
                // 'This constumer material combination is also eligible on teh following contracts:<parameters>Cardinal Agreement, Cost Description, Cost External Description, Contract Cost, <pagination>'
                logger.info("agreement");
                logger.info(agreement);
                logger.info(agreement.primaryAgreement);
                this.watson.response.output.text[0] = this.watson.getContext("material_return")
                if (!agreement.primaryAgreement) {
                    this.watson.response.output.text[1] = `Item is not currently accessing a primary agreement ie non-contracted`
                } else {
                    const contract_number = agreement.agreementNumber;
                    const contract_type = agreement.agreementCategoryType;
                    const eligible_start_date = agreement.agreementMaterialValidFromDateDisplay;
                    const eligible_end_date = agreement.agreementMaterialValidToDateDisplay;
                    this.watson.response.output.text[1] = `Winning price for soldto ${soldto} and material ${cah_material} comes from ${contract_type} ${contract_number}, effective from ${eligible_start_date} to ${eligible_end_date}`
                }
                this.watson.response.output.text[2] = `Would you like to check another membership request?`
                resolve(this.watson.response);
            }).catch((err) => {
                logger.error(JSON.parse(err));
                this.watson.response.context.matNumErr = `${this.watson.response.context.cah_material} is an ${err}`;
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    reject(rest);
                });
            });
        })
    }

    checkSoldTo() {
        logger.debug("inside check SoldTo method");
        return new Promise((resolve, reject) => {
            this.watson.setContext("CheckSoldto", false);
            const sold_to = this.watson.getContext("soldto");
            this.iprice.checkSoldToCustomer(sold_to).then((soldToBody) => {
                this.watson.setContext("counter", 0);
                this.watson.setContext("soldtoerr", false);
                const customer = JSON.parse(soldToBody);
                const distChannels = customer.result.distributionChannelIds;
                let dc = [];
                distChannels.forEach(element => {
                    dc.push(`${element.id} - ${element.description}`);
                });
                this.watson.setContext("dist_channel", dc);
                if (dc.length > 1) {
                    this.watson.response.output.text[0] = `<div>Here is the customer you have entered:</div>` +
                        `<div>Customer: <b>${customer.result.customerName}</b></div>`;
                    this.watson.response.output.text[1] = 'Please select the distribution channel';
                    this.watson.response.output.chiapayload = [{
                        'type': 'button',
                        'values': dc
                    }];
                    resolve(this.watson.response);
                } else if (dc.length == 1) {
                    this.watson.response.input.text = dc.toString();
                    this.watson.response.context.singleDc = true;
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        logger.info(`Customer got one DC`);
                        logger.info(rest);
                        resolve(rest);
                    });
                }
            }).catch((err) => {
                logger.error(err);
                const errMessage = JSON.parse(err);
                this.watson.setContext("soldtoerr", errMessage.result.errorMessage);
                logger.info(`priting error response..`)
                logger.info(this.watson.response);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    logger.error(`Priting error skip input response`);
                    logger.error(rest);
                    resolve(rest);
                });
            });
        });
    }

    CheckMaterial() {
        logger.debug(`inside check material method`);
        return new Promise((resolve, reject) => {
            this.watson.response.context.CheckMaterial = false;
            this.watson.response.context.matNumErr = false;

            const cah_material = this.watson.getContext("cah_material");
            this.iprice.checkMaterialNum(cah_material).then((matNumBody) => {
                let matNum = JSON.parse(matNumBody);
                let uom = matNum.result.unitOfMeasures;
                this.watson.response.context.counter = 0;
                this.watson.response.context.uom = uom;
                if (uom.length > 0) {
                    this.watson.response.output.chiapayload = [{
                            'type': 'text',
                            'values': [`<div>Here is the vendor and the description for the material number you have entered.</div>
                                        <div>Vendor: <b>${matNum.result.vendorName}</b>  Material Description: <b>${matNum.result.materialDescription}</b></div>`]
                        },
                        {
                            'type': 'text',
                            'values': [`<div>What is the UOM you would like checked? </div>
                                                <div>You can choose one of the several options below or type in your own UOM.</div>`]
                        },
                        {
                            'type': 'button',
                            'values': uom
                        }
                    ];
                } else {
                    this.watson.response.output.chiapayload = [{
                            'type': 'text',
                            'values': [`<div>Here is the vendor and the description for the material number you have entered.</div>
                                    <div>Vendor: <b>${matNum.result.vendorName}</b>  Material Description: <b>${matNum.result.materialDescription}</b></div>`]
                        },
                        {
                            'type': 'text',
                            'values': [`<div>What is the UOM you would like checked? </div>
                                            <div>You can choose one of the several options below or type in your own UOM.</div>`]
                        },
                        {
                            'type': 'button',
                            'values': ['Sales']
                        }
                    ];
                }
                resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                let errMessage = JSON.parse(err);
                this.watson.response.context.matNumErr = `${this.watson.response.context.cah_material} is an ${errMessage.result.errorMessage}`;
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    getPriceQuote() {
        logger.debug("inside get price quote method");
        return new Promise((resolve, reject) => {
            this.watson.response.context.getPriceQuote = false;
            this.iprice.checkExistingPrice(this.watson.response.context).then((priceQuote) => {
                const pq = JSON.parse(priceQuote);
                logger.warn(pq);
                if (!pq.result.isPriceQuoteAvailable) {
                    this.watson.response.output.text[0] = `PriceQuote is not available for customer number: ${pq.result.customerNumber}`;
                    this.watson.response.output.text[1] = `To check another price, just hit refresh.`
                } else if (pq.result.isPriceQuoteInvalid) {
                    this.watson.response.output.text[0] = `${pq.result.priceQuoteMessageText}`;
                    this.watson.response.output.text[1] = `To check another price, just hit refresh.`
                } else {
                    let tierResponse = '';
                    const priceLocked = pq.result.currentPriceLockedIndicator = 'YES' ? 'locked' : 'unlocked';
                    const priceResponse = `As of ${pq.result.priceQuoteAsOfDate}, ${pq.result.customerName} - ${pq.result.customerNumber} is accessing \n
                        ${pq.result.materialNumber} at a ${priceLocked} price of <b>${pq.result.currentPrice}</b>/${pq.result.unitOfMeasure}.\n`;
                    if (pq.result.costIndicator == 'AG' || pq.result.costIndicator == 'GR') {
                        tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} tier ${pq.result.costTierNum} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`;
                    } else if (pq.result.costIndicator == 'LC') {
                        tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`;
                    } else if (pq.result.costIndicator == 'BL' || pq.result.costIndicator == 'NC') {
                        tierResponse = `This price comes from Cardinal local pricing`
                    } else if (pq.result.costIndicator == 'GM') {
                        tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.distAgreementExtDesc} and is valid from ${pq.result.currentPriceValidityFromDate} to ${pq.result.currentPriceValidityToDate}.`;
                    }
                    this.watson.response.output.text[0] = priceResponse;
                    if (tierResponse) {
                        this.watson.response.output.text[1] = tierResponse;
                        this.watson.response.output.text[2] = `To check another price, just hit refresh.`
                    } else {
                        this.watson.response.output.text[1] = `To check another price, just hit refresh.`
                    }
                }
                resolve(this.watson.response);
            }, (err) => {
                logger.error(`Error Occured during Price Quote Check`);
                logger.error(err);
                reject(err);
            })
        })
    }

    checkProposal() {
        logger.debug(`Check Proposal Code called...`);
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_Proposal", false);
            this.watson.setContext("proposalerr", false);

            const iPriceUrl = 'http://iprice.dev.cardinalhealth.net';
            const proposal_number = this.watson.getContext("proposal_number");
            logger.info(`Proposal# Identified - ${proposal_number}`);
            this.iprice.checkProposalStatus(proposal_number).then((proposalResponse) => {
                const prop_stat = JSON.parse(proposalResponse);
                let payloadArray = [];

                if (this.watson.getContext("isProposalSpecific")) {
                    this.watson.setContext("isProposalSpecific", false);
                    payloadArray.push({
                        'type': 'table',
                        'values': []
                    }, {
                        'type': 'text',
                        'values': ['Would you like to check on another proposal?']
                    }, {
                        'type': 'button',
                        'values': ['yes', 'no']
                    })
                } else {
                    payloadArray.push({
                        'type': 'table',
                        'values': []
                    }, {
                        'type': 'text',
                        'values': [`This is all the information I can show you at the moment. For additional information, go to <a href=${iPriceUrl} target="_blank">iPrice</a>`]
                    })
                }
                prop_stat.result.forEach(element => {
                    payloadArray[0].values.push(
                        `<table style='width: 100%;' border='1' cellpadding='10'><tbody><tr><td>Proposal Number</td><td>${element.proposalId}</td>` +
                        `</tr><tr><td>Proposal Type</td><td>${element.proposalType}</td></tr><tr><td>Proposal Description</td><td>${element.proposalDescription}</td>` +
                        `</tr><tr><td>Customer Name</td><td>${element.customerName}</td></tr><tr><td>Material Count</td><td>${element.totalLineCount}</td></tr><tr><td>Proposal Load Status</td><td>${element.loadStatusDesc}</td></tr></tbody></table>`
                    );
                });
                this.watson.response.output.chiapayload = payloadArray;
                resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                let errMessage = JSON.parse(err);
                this.watson.response.context.proposalerr = `${errMessage.result.errorMessage}`;
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    postWatsonMessage(request) {
        logger.debug(`watson input`);
        return new Promise((resolve, reject) => {
            this.watson.setRequest(request);
            this.iprice.setUid(this.watson.request.login_uid);
            this.watson.watsonPostMessage(request.body).then((watsonResponse) => {
                this.watson.setResponse(watsonResponse);
                if (this.watson.getContext("CheckSoldto")) resolve(this.checkSoldTo());
                else if (this.watson.getContext("MembershipCheckSoldto")) resolve(this.membershipCheckSoldTo());
                else if (this.watson.getContext("MembershipCheckMaterial")) resolve(this.membershipCheckMaterial());
                else if (this.watson.getContext("CheckMaterial")) resolve(this.CheckMaterial());
                else if (this.watson.getContext("getPriceQuote")) resolve(this.getPriceQuote());
                else if (this.watson.getContext("Check_Proposal")) resolve(this.checkProposal());
                else resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        });
    }
}