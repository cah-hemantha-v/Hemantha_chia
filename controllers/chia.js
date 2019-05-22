'use strict';
const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class ChiaController {
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
                if (dc.length > 0) {
                    this.watson.response.output.chiapayload = [{
                        'type': 'button',
                        'values': dc
                    }];
                }
                resolve(this.watson.response);
            }).catch((err) => {
                logger.error(err);
                const errMessage = JSON.parse(err);
                this.watson.setContext("soldtoerr", errMessage.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    logger.error(this.watson.response);
                    reject(rest);
                });
            });
        }).then((result) => {
            return result;
        })
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
                    reject(rest);
                });
            });
        }).then((result) => {
            return result;
        }).catch((err) => {
            return err;
        })
    }

    getPriceQuote() {
        logger.debug("inside get price quote method");
        return new Promise((resolve, reject) => {
            this.watson.response.context.getPriceQuote = false;
            this.iprice.checkExistingPrice(this.watson.response.context).then((priceQuote) => {
                const pq = JSON.parse(priceQuote);
                const priceLocked = pq.result.currentPriceLockedIndicator == 'YES' ? 'locked' : 'unlocked';
                const priceResponse = `As of ${pq.result.priceQuoteAsOfDate}, ${pq.result.customerName} - ${pq.result.customerNumber} is accessing \n${pq.result.materialNumber} at a ${priceLocked} price of <b>${pq.result.currentPrice}</b>/${pq.result.unitOfMeasure}.\n`;
                this.watson.response.output.text[0] = priceResponse;
                this.watson.response.output.text[1] = `To check another price, just hit refresh.`
                resolve(this.watson.response);
            }, (err) => {
                logger.error(`Error Occured during Price Quote Check`);
                logger.error(err);
                reject(err);
            })
        }).then((result) => {
            return result;
        }).catch((err) => {
            return err;
        })
    }

    checkProposal() {
        logger.debug(`Check Proposal Code called...`);
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_Proposal", false);
            this.watson.setContext("proposalerr", false);

            const iPriceUrl = 'http://iprice.dev.cardinalhealth.net';
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
                this.watson.setContext("chiapayload", payloadArray);
                resolve(this.watson.response);
            }, (err) => {
                logger.error(err);
                const errMessage = JSON.parse(err);
                this.watson.response.output.text[0] = `${errMessage.result.errorMessage}`;
                this.watson.response.output.text[1] = `Can you please provide a valid proposal number?`;
                this.watson.response.context.proposalerr = errMessage.result.errorMessage;
                reject(this.watson.response);
            });
        }).then((result) => {
            return result;
        });
    }

    postWatsonMessage(request) {
        logger.debug(`watson input`);
        return new Promise((resolve, reject) => {

            this.watson.setRequest(request);
            this.iprice.setUid(this.watson.request.login_uid || 'kararu01');

            this.watson.watsonPostMessage().then((watsonResponse) => {
                this.watson.setResponse(watsonResponse);
                if (this.watson.getContext("CheckSoldto")) resolve(this.checkSoldTo());
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