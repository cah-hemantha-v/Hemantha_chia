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
                        data.output.chiapayload = [{"type":"button","values":dc}];
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
                        console.log(err)
                        reject(err);
                    });
                } else if (data.context.getPriceQuote) {
                    data.context.getPriceQuote = false;
                    let getPQ = this.iprice.checkExistingPrice(data.context);
                    getPQ.then((priceQuote) => {
                        let pq = JSON.parse(priceQuote);
                        let priceLocked = pq.result.priceLockedIndicator = 'YES' ? 'locked' : 'unlocked';
                        const priceResponse = `As of ${pq.result.asOfDate}, ${pq.result.customerName} - ${pq.result.customerNumber} is accessing \n
                        ${pq.result.materialNumber} at a ${priceLocked} price of <b>${pq.result.price}</b>/${pq.result.unitOfMeasure}.\n \n`;
                        data.output.text[0] = priceResponse;
                        resolve(data);
                    }, (err) => {
                        console.log(err)
                        reject(err);
                    })
                } else {
                    resolve(data);
                }
            });
        });
    }

    processWatsonSecondCall() {

    }
}

module.exports = ChiaController;