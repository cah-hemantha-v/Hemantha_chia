const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');

module.exports = class Pricing {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
    }

    checkSoldTo() {
        logger.debug("2. Inside checkSoldTo() function.");
        return new Promise((resolve, reject) => {
            this.watson.setContext("CheckSoldto", false);
            let checkpricing = this.watson.getContext("checkpricing");
            this.iprice.checkSoldToCustomer(checkpricing.soldto).then((soldToBody) => {
                this.watson.setContext("counter", 0);
                this.watson.setContext("soldtoerr", false);
                const distChannels = soldToBody.result.distributionChannelIds;
                let dc = [];
                distChannels.forEach(element => {
                    dc.push(`${element.id} - ${element.description}`);
                });
                this.watson.setContext("dist_channel", dc);
                if (dc.length > 1) {
                    this.watson.response.output.text[0] = `<div>Here is the customer you have entered:</div><div>Customer: <b>${soldToBody.result.customerName}</b></div>`;
                    this.watson.response.output.text[1] = 'Please select the distribution channel.';
                    this.watson.response.output.chiapayload = [{
                        'type': 'button',
                        'values': dc
                    }];
                    resolve(this.watson.response);
                } else if (dc.length == 1) {
                    this.watson.response.input.text = dc.toString();
                    this.watson.setContext("singleDc", true);
                    this.watson.setContext("customer_name", soldToBody.result.customerName);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                }
            }).catch((err) => {
                logger.error(err);
                this.watson.setContext("soldtoerr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    checkMaterial() {
        logger.debug("2. Inside checkMaterial() function.");
        return new Promise((resolve, reject) => {
            this.watson.response.context.CheckMaterial = false;
            this.watson.response.context.matNumErr = false;
            let checkpricing = this.watson.getContext("checkpricing");
            this.iprice.checkMaterialNum(checkpricing.cah_material).then((matNumBody) => {
                const uom = ['Sales'].concat(matNumBody.result.unitOfMeasures);
                this.watson.response.context.counter = 0;
                this.watson.response.context.uom = uom;
                this.watson.response.output.chiapayload = [{
                        'type': 'text',
                        'values': [`<div>Here is the vendor and the description for the material number you have entered.</div>
                                        <div>Vendor: <b>${matNumBody.result.vendorName}</b></div><div>Material Description: <b>${matNumBody.result.materialDescription}</b></div>`]
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
                this.watson.response.context.matNumErr = `${this.watson.response.context.cah_material} is an ${err.result.errorMessage}`;
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    getPriceQuote() {
        logger.debug("2. Inside getPriceQuote() function.")
        this.watson.setContext('Get_PriceQuote', false);
        return new Promise((resolve, reject) => {
            let checkpricing = this.watson.getContext("checkpricing");
            this.iprice.checkExistingPrice(checkpricing).then((cepResponse) => {
                if (cepResponse.statusCode == 300) {
                    let positionCodes = [];
                    this.watson.setContext('hasMultiPosition', true);
                    cepResponse.result.positions.forEach(element => {
                        positionCodes.push(`${element.positionCode} (${element.saleItemGroupDesc})`);
                    });
                    cepResponse.result.positions = positionCodes;
                    this.watson.setContext('positioncodes', cepResponse.result);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                } else if (cepResponse.statusCode == 200) {
                    this.watson.setContext('PriceQuote', cepResponse.result);
                    if (!cepResponse.result.editingPermitted) {
                        let checkpricing = this.watson.getContext('checkpricing');
                        console.log(`checkpricing-- ${checkpricing.workspace}`);
                        this.deleteProposal(cepResponse.result.proposalId, checkpricing.workspace).then((status) => {
                            if (status) {
                                logger.info(`PID: ${cepResponse.result.proposalId} is deleted`);
                                return true;
                            }
                        }).then((data) => {
                            this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                                resolve(rest);
                            });
                        });
                    } else {
                        this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                            resolve(rest);
                        });
                    }
                } else if (cepResponse.statusCode == 404) {
                    this.watson.setContext('pricequote_err', true);
                    this.watson.setContext('pricequote_errmessage',cepResponse.result);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                }
            }).catch((err) => {
                logger.error(`Error Occured during Price Quote Check`);
                logger.error(err);
                reject(err);
            });
        })
    }

    handleMultiPositions(body) {
        this.watson.setContext('hasMultiPosition', true);
        this.watson.setContext('positioncodes', body.result);
        this.watson.watsonPostMessage(this.watson.response).then((rest) => {
            return rest;
        })
    }

    checkProposal() {
        logger.debug("2. Inside checkProposal() function.");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_Proposal", false);
            this.watson.setContext("proposalerr", false);
            const iPriceUrl = 'http://iprice.cardinalhealth.net/iprice/index.jsp';
            const proposal_number = this.watson.getContext("proposal_number");
            logger.info(`proposal number - ${proposal_number}`);
            this.iprice.checkProposalStatus(proposal_number).then((proposalResponse) => {
                let payloadArray = [];
                console.log(`Prop status length -- ${proposalResponse.result.length}`);
                if (proposalResponse.result.length > 0) {
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
                    proposalResponse.result.forEach(element => {
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
                this.watson.response.context.proposalerr = err.result.errorMessage;
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    deleteProposal(pid,workspace) {
        logger.debug("2. Inside deleteProposal() function.");
        this.watson.setContext('Delete_Proposal', false);
        return new Promise((resolve, reject) => {
            this.iprice.deleteProposal(pid,workspace).then((delResponse) => {
                logger.info(`delResponse-${JSON.stringify(delResponse)}`);
                if (delResponse.result.success) {
                    logger.info(`PID: ${pid} is deleted successfully`);
                    resolve(this.watson.response);
                }
            }).catch((error) => {
                logger.error(`PID not deleted - ${error}`);
                this.watson.setContext('proposalDeleted', false);
                resolve(this.watson.response);
            });
        })
    }

    checkGovernance() {
        logger.debug("2. Inside checkGovernance() function.");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_Governance", false);
            this.watson.setContext("governanceerr", false);
            //let priceQuote = this.watson.getContext("PriceQuote");
            let submitProposal = this.watson.getContext("submitproposal");
            this.iprice.updatePricingProposal(submitProposal).then((proposalResponse) => {
                logger.info('printing proposalResponse');
                logger.debug(proposalResponse);
                this.watson.setContext("govEngineResponse", proposalResponse.result);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            }).catch((err) => {
                logger.error(err);
                this.watson.setContext("governanceerr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    submitProposal() {
        logger.debug("2. Inside submitProposal() function.");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Submit_Proposal", false);
            this.watson.setContext("submitproposalerr", false);
            let submitProposal = this.watson.getContext("submitproposal");
            this.iprice.submitPricingProposal(submitProposal).then((submitResponse) => {
                logger.info('printing submitResponse');
                logger.debug(submitResponse);
                this.watson.setContext("isProposalSubmitted", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            }).catch((err) => {
                this.watson.setContext("isProposalSubmitted", false);
                logger.error(err);
                this.watson.setContext("submitproposalerr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });

    }
}