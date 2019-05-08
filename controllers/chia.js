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
                        data.output.chiapayload = [{
                            "type": "button",
                            "values": dc
                        }];
                        resolve(data);
                    }, (err) => {
                        console.error(new Error(err));
                        let errMessage = JSON.parse(err);
                        data.output.text[0] = `${errMessage.result.errorMessage}`;
                        data.output.text[1] = `Can you please provide a valid soldto?`;
                        data.context.soldtoerr = errMessage.result.errorMessage;
                        resolve(data);
                    });
                } else if (data.context.CheckMaterial) {
                    console.log(`called material number`);
                    data.context.CheckMaterial = false;
                    let getMN = this.iprice.checkMaterialNum(data.context.cah_material);
                    getMN.then((matNumBody) => {
                        let matNum = JSON.parse(matNumBody);
                        let uom = matNum.result.unitOfMeasures;
                        data.context.uom = `test test hello`;
                        data.output.chiapayload = [{
                                'type': 'text',
                                'values': [`Here is the Vendor and the Description for the Material number you entered \n
                                    Vendor: <b>${matNum.result.vendorName}</b>  Material Description: <b>${matNum.result.materialDescription}</b>`]
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
                        data.output.text[0] = `${errMessage.result.errorMessage}`;
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
                    const priceResponse = `As of ${pq.result.maintPriceEffectiveDate}, ${pq.result.customerName} - ${pq.result.customerNumber} is accessing \n
                        ${pq.result.materialNumber} at a ${priceLocked} price of <b>${pq.result.currentPrice}</b>/${pq.result.unitOfMeasure}.\n
                        
                        `;
                        data.output.text[0] = priceResponse;
                        resolve(data);
                    }, (err) => {
                        console.log(err)
                        reject(err);
                    });
                } else if (data.context.Check_Proposal) {
                    data.context.Check_Proposal = false;
                    let getPS = this.iprice.checkProposalStatus(data.context.proposal_number);

                    getPS.then((ProposalStatus) => {
                        let prop_stat = JSON.parse(ProposalStatus);
                        const ProposalResponse = 'Based on the Proposal Number your entered:\n\nProposal Number: ${prop_stat.proposalId}\nProposal Type: ${prop_stat.proposalType}\nProposal Description: ${prop_stat.proposalDescription}\nCustomer Name: ${prop_stat.customerName}\nMaterial Count: ${prop_stat.loadedCount}\nProposal Load Status: ';

                        data.output.text[0] = ProposalResponse;
                        resolve(data);
                    }, (err) => {
                        console.error(new Error(err));
                        let errMessage = JSON.parse(err);
                        data.output.text[0] = `${errMessage.result.errorMessage}`;
                        data.output.text[1] = `Can you please provide a valid proposal number?`;
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