'use strict';
const watson = require('./watson');
const iPrice = require('./iPrice');

class ChiaController {
    constructor() {
        this.watsonCall = new watson();
        this.iprice = new iPrice();
    }

    postWatsonMessage(message) {
        return new Promise((resolve, reject) => {
            // console.log(`Input Message`);
            // console.log(JSON.stringify(message, null, 2));
            let watsonResponse = this.watsonCall.watsonPostMessage(message);
            watsonResponse.then((data) => {
                if (data.context.CheckSoldto) {
                    data.context.CheckSoldto = false;
                    let getDC = this.iprice.checkSoldToCustomer(data.context.soldto);
                    getDC.then((soldToBody) => {
                        let soldTo = JSON.parse(soldToBody);
                        let distChannels = soldTo.result.distributionChannelIds;
                        let dc = [];
                        distChannels.forEach(element => {
                            dc.push(`${element.id} - ${element.description}`);
                        });
                        data.context.dist_channel = dc;
                        if (dc.length > 0) {
                            data.output.chiapayload = [{
                                'type': 'button',
                                'values': dc
                            }];
                        } else {
                            data.output.chiapayload = [{
                                'type': 'button',
                                'values': ['Sales']
                            }];
                        }
                        resolve(data);
                    }, (err) => {
                        console.error(new Error(err));
                        let errMessage = JSON.parse(err);
                        data.output.text[0] = `${errMessage.result.errorMessage}`;
                        data.output.text[1] = `Can you please provide a valid customer soldto?`;
                        data.context.soldtoerr = errMessage.result.errorMessage;
                        resolve(data);
                    });
                } else if (data.context.CheckMaterial) {
                    console.log(`called material number`);
                    data.context.CheckMaterial = false;
                    data.context.matNumErr = false;
                    let getMN = this.iprice.checkMaterialNum(data.context.cah_material);
                    getMN.then((matNumBody) => {
                        let matNum = JSON.parse(matNumBody);
                        let uom = matNum.result.unitOfMeasures;
                        data.output.chiapayload = [{
                                'type': 'text',
                                'values': [`Here is the vendor and the description for the material number you have entered.`]
                            }, {
                                'type': 'text',
                                'values': [`Vendor: <b>${matNum.result.vendorName}</b>  Material Description: <b>${matNum.result.materialDescription}</b>`]
                            },
                            {
                                'type': 'text',
                                'values': [`What is the UOM you would like checked? \n
                                        You can choose one of the several options below or type in your own UOM.`]
                            },
                            {
                                'type': 'button',
                                'values': uom
                            }
                        ];
                        resolve(data);
                    }, (err) => {
                        console.error(new Error(err));
                        let errMessage = JSON.parse(err);
                        data.output.text[0] = `${data.context.cah_material} is an ${errMessage.result.errorMessage}`;
                        data.output.text[1] = `Can you please provide a valid Material number?`;
                        data.context.matNumErr = errMessage.result.errorMessage;
                        resolve(data);
                    });
                } else if (data.context.getPriceQuote) {
                    data.context.getPriceQuote = false;
                    let getPQ = this.iprice.checkExistingPrice(data.context);
                    getPQ.then((priceQuote) => {
                        let pq = JSON.parse(priceQuote);
                        console.log(`final quote -- ${pq}`);
                        let priceLocked = pq.result.currentPriceLockedIndicator = 'YES' ? 'locked' : 'unlocked';
                        let priceResponse = `As of ${pq.result.priceQuoteAsOfDate}, ${pq.result.customerName} - ${pq.result.customerNumber} is accessing \n
                        ${pq.result.materialNumber} at a ${priceLocked} price of <b>${pq.result.currentPrice}</b>/${pq.result.unitOfMeasure}.\n`;
                        let tierResponse = `This price comes from ${pq.result.costForPriceSource} contract ${pq.result.supplierAgreementDescription} - ${pq.result.supplierAgreementExtDescription} and is valid from ${pq.result.contractCostValidityDateFrom} to ${pq.result.contractCostValidityDateTo}.`
                        data.output.text[0] = priceResponse;
                        data.output.text[1] = tierResponse;
                        data.output.text[2] = `To check another price, just hit refresh.`
                        resolve(data);
                    }, (err) => {
                        console.log(err)
                        reject(err);
                    })
                } else if (data.context.Check_Proposal) {
                    console.log(`Check Proposal Code called...`);
                    let iPriceUrl = 'http://iprice.dev.cardinalhealth.net';
                    data.context.Check_Proposal = false;
                    data.context.proposalerr = false;
                    let getPS = this.iprice.checkProposalStatus(data.context.proposal_number);
                    console.log(data.context.proposal_number)
                    data.context.proposal_number = null
                    getPS.then((proposalResponse) => {
                        let prop_stat = JSON.parse(proposalResponse);
                        let payloadArray = [];
                        if (data.context.isProposalSpecific) {
                            data.context.isProposalSpecific=false;
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
                            }, {
                                'type': 'text',
                                'values': ['Have a great day!']
                            })
                        }
                        prop_stat.result.forEach(element => {
                            payloadArray[0].values.push(
                                `<table style='width: 100%;' border='1' cellpadding='10'><tbody><tr><td>Proposal Number</td><td>${element.proposalId}</td>` +
                                `</tr><tr><td>Proposal Type</td><td>${element.proposalType}</td></tr><tr><td>Proposal Description</td><td>${element.proposalDescription}</td>` +
                                `</tr><tr><td>Customer Name</td><td>${element.customerName}</td></tr><tr><td>Material Count</td><td>${element.loadedCount}</td></tr><tr><td>Proposal Load Status</td><td>${element.loadStatusDesc}</td></tr></tbody></table>`
                            );
                        });
                        data.output.chiapayload = payloadArray;
                        resolve(data);
                    }, (err) => {
                        console.error(new Error(err));
                        let errMessage = JSON.parse(err);
                        data.output.text[0] = `${errMessage.result.errorMessage}`;
                        data.output.text[1] = `Can you please provide a valid proposal number?`;
                        data.context.proposal_number = null
                        data.context.proposalerr = errMessage.result.errorMessage;
                        resolve(data);
                    });
                } else {
                    resolve(data);
                }
            });
        });
    }
}

module.exports = ChiaController;