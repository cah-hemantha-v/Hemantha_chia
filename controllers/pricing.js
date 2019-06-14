const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class Pricing {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
    }

    checkSoldTo() {
        logger.debug("Inside CheckSoldto - Pricing JS");
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
                this.watson.setContext('PriceQuote', pq.result);
                if (!pq.result.editingPermitted) {
                    this.deleteProposal(pq.result.proposalId).then((status) => {
                        if (status) {
                            logger.info(`PID: ${pq.result.proposalId} is deleted`)
                        }
                    });
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
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
            logger.info(`proposal number - ${proposal_number}`);
            this.iprice.checkProposalStatus(proposal_number).then((proposalResponse) => {
                const prop_stat = JSON.parse(proposalResponse);
                let payloadArray = [];
                console.log(`Prop status length -- ${prop_stat.result.length}`);
                if (prop_stat.result.length > 0) {
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
                        this.watson.setContext('hasProposal', true);
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
                    this.watson.setContext('chiapayload', payloadArray);
                } else {
                    this.watson.setContext('hasProposal', false);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
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

    deleteProposal(pid) {
        logger.info('Delete proposal called.');
        return new Promise((resolve, reject) => {
            this.iprice.deleteProposal(pid).then((delResponse) => {
                const delRes = JSON.parse(delResponse);
                logger.info(`delRes-${JSON.stringify(delRes)}`);
                if (delRes.result.success) {
                    logger.info(`PID: ${pid} is deleted`);
                    resolve(this.watson.response);
                }
            }).catch((error) => {
                logger.error(`PID not deleted - ${error}`);
                this.watson.setContext('proposalDeleted', false);
                resolve(this.watson.response);
            });
        })
    }
}