'use strict';
const request = require("request");

class iPrice {
    constructor() {
        this.url = process.env.IPRICE_HOST || 'https://api.dev.cardinalhealth.com';
    }

    createIPricePost(url, qs, method) {
        return new Promise((resolve, reject) => {
            var options = {
                method: method,
                url: url,
                qs: qs,
                headers: {
                    'Host': 'api.dev.cardinalhealth.com',
                    'uid': 'batmah01',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': process.env.APIGEE_APIKEY || 'CfeAcU7rFW0EoMhHUAq0mAi86XSmlO4p'
                }
            };
            request(options, function (error, response, body) {
                if (!error) {
                    if (response.statusCode == 200) {
                        resolve(response.body);
                    } else if (response.statusCode == 404) {
                        reject(response.body);
                    }
                }
            });
        });
    }

    checkSoldToCustomer(soldto) {
        console.log(`sold to received -- ${soldto}`);
        let customerUrl = `${this.url}` + '/medical-iprice-customer';
        console.log(customerUrl);
        let qs = {
            customerNumber: soldto
        };
        return this.createIPricePost(customerUrl, qs, 'GET');
    }

    checkMaterialNum(matNum) {
        console.log(`Received Mat num -- ${matNum}`);
        let materialUrl = `${this.url}` + '/medical-iprice-material';
        let qs = {
            materialNumber: matNum
        };
        return this.createIPricePost(materialUrl, qs, 'GET');
    }

    checkExistingPrice(priceQuote) {
        let qs = {
            customerNumber: priceQuote.soldto,
            materialNumber: priceQuote.cah_material,
            um: priceQuote.selected_uom,
            asOfDate: priceQuote.selected_date,
            dc: priceQuote.selected_dc
        };
        let pricequoteUrl = `${this.url}` + '/medical-iprice-proposal';
        return this.createIPricePost(pricequoteUrl, qs, 'POST');
    }

    checkProposalStatus(ProposalNumber) {
        let qs = {
            proposalId: ProposalNumber || '',
            returnLimit: 10
        };
        let ProposalNumberUrl = `${this.url}` + '/medical-iprice-proposal/status';
        return this.createIPricePost(ProposalNumberUrl, qs, 'GET');
    }
}

module.exports = iPrice;