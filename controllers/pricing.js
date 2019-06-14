const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class Pricing {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
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
                    this.watson.response.output.text[0] = `<div>Here is the customer you have entered:</div><div>Customer: <b>${customer.result.customerName}</b></div>`;
                    this.watson.response.output.text[1] = 'Please select the distribution channel.';
                    this.watson.response.output.chiapayload = [{
                        'type': 'button',
                        'values': dc
                    }];
                    resolve(this.watson.response);
                } else if (dc.length == 1) {
                    this.watson.response.input.text = dc.toString();
                    this.watson.setContext("singleDc", true);
                    this.watson.setContext("customer_name", customer.result.customerName);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                }
            }).catch((err) => {
                logger.error(err);
                const errMessage = JSON.parse(err);
                this.watson.setContext("soldtoerr", errMessage.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    checkMaterial() {
        logger.debug(`inside check material method`);
        return new Promise((resolve, reject) => {
            this.watson.response.context.CheckMaterial = false;
            this.watson.response.context.matNumErr = false;

            const cah_material = this.watson.getContext("cah_material");
            this.iprice.checkMaterialNum(cah_material).then((matNumBody) => {
                const matNum = JSON.parse(matNumBody);
                const uom = ['Sales'].concat(matNum.result.unitOfMeasures);
                this.watson.response.context.counter = 0;
                this.watson.response.context.uom = uom;
                this.watson.response.output.chiapayload = [{
                        'type': 'text',
                        'values': [`<div>Here is the vendor and the description for the material number you have entered.</div>
                                        <div>Vendor: <b>${matNum.result.vendorName}</b></div><div>Material Description: <b>${matNum.result.materialDescription}</b></div>`]
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
        return new Promise((resolve, reject) => {
            this.watson.response.context.getPriceQuote = false;
            this.iprice.checkExistingPrice(this.watson.response.context).then((priceQuote) => {
                const pq = JSON.parse(priceQuote);
                console.log(pq);
                if (pq.result.isPriceQuoteAvailable && pq.result.isPriceQuoteInvalid) {
                    this.watson.response.output.text[0] = `${pq.result.priceQuoteMessageText}`;
                    this.watson.response.output.text[1] = `To check another price, just hit refresh.`;
                } else if (!pq.result.isPriceQuoteAvailable) {
                    this.watson.response.output.text[0] = `PriceQuote is not available for customer number: ${pq.result.customerNumber}.`;
                    this.watson.response.output.text[1] = `Please refresh to check another customer.`
                } else if (pq.result.isPriceQuoteAvailable && !pq.result.isPriceQuoteInvalid) {
                    let tierResponse = '';
                    const priceLocked = pq.result.currentPriceLockedIndicator = 'YES' ? 'locked' : 'unlocked';
                    const priceResponse = `As of ${pq.result.priceQuoteAsOfDate}, ${pq.result.customerName} - ${pq.result.customerNumber} is accessing \n
                        ${pq.result.materialNumber} at a ${priceLocked} price of <b>${pq.result.currentPrice}</b>/${pq.result.unitOfMeasure}.\n`;
                    if (pq.result.costIndicator == 'AG' || pq.result.costIndicator == 'GR') {
                        if (pq.result.costTierNum != '') {
                            tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} tier ${pq.result.costTierNum} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`;
                        } else {
                            tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`;
                        }
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
            const iPriceUrl = 'http://iprice.cardinalhealth.net/iprice/index.jsp';
            const proposal_number = this.watson.getContext("proposal_number");
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
                        'values': [`This is all the information I can show you at the moment. For additional information, go to <a href=${iPriceUrl} target="_blank">iPrice</a>`,
                            'Can I help you with anything else? Refresh to see all your options.'
                        ]
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
                this.watson.response.context.proposalerr = errMessage.result.errorMessage;
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    checkGovernance() {
        logger.debug(`Check Governance Code called...`);
        return new promise((resolve, reject) => {
            this.watson.setContext("Check_Governance", false);
            this.watson.setContext("governanceerr", false);
            const proposalDetail = {
                proposal_number: this.watson.getContext("proposalId"),
                line_number: this.watson.getContext("lineNum"),
                load_price: this.watson.getContext("loadAs"),
                amount: this.watson.getContext("amount"),
                effective_date: this.watson.getContext("fromDate"),
                expiration_date: this.watson.getContext("toDate")
            };

            this.iprice.updatePricingProposal(proposalDetail).then((proposalResponse) => {
                const prop_info = JSON.parse(proposalResponse);

                this.watson.setContext("govEngineResponse", prop_info.result);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });

            }).catch((err) => {
                logger.error(err);
                let errMessage = JSON.parse(err);
                this.watson.setContext("governanceerr", errMessage.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }
}