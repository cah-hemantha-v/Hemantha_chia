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
            console.log(`Input Message`);
            console.log(JSON.stringify(message, null, 2));
            let watsonResponse = this.watsonCall.watsonPostMessage(message);
            watsonResponse.then((data) => {
                if (data.context.checkSoldTo) {
                    data.context.checkSoldTo = false;
                    let getDC = this.iprice.checkSoldToCustomer(data.context.soldto);
                    getDC.then((soldToBody) => {
                        let soldTo = JSON.parse(soldToBody);
                        let distChannels = soldTo.result.distributionChannelIds;
                        let dc = [];
                        distChannels.forEach(element => {
                            dc.push(`${element.id} - ${element.description}`);
                        });
                        data.output.chiapayload = [{
                            "type": "button",
                            "values": dc
                        }];
                        resolve(data);
                    }, (err) => {
                        reject(err);
                    });
                } else if (data.context.checkMaterial) {
                    data.context.checkMaterial = false;
                    let getMN = this.iprice.checkMaterialNum(data.context.material_number);
                    getMN.then((matNumBody) => {
                        let matNum = JSON.parse(matNumBody);
                        let uom = matNum.result.unitOfMeasures;
                        data.output.chiapayload = [{
                                'type': 'text',
                                'values': [`Here is the Vendor and the Description for the Material number you entered \n 
                                    Vendor: <b>${matNum.result.vendorName}</b>  Material Description: <b>${matNum.result.materialDescription}</b>`
                                ]
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
                        reject(err);
                    })
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
                        reject(err);
                    })
                } else {
                    resolve(data);
                }
            }, (err) => {
                reject(err);
            });
        });
    }
}

module.exports = ChiaController;