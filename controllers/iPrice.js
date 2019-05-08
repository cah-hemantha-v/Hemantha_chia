'use strict';
const request = require("request");

class iPrice {
    constructor() {
        this.url = process.env.IPRICE_HOST || `http://iprice.dev.cardinalhealth.net`;
    }

    createIPricePost(url, qs) {
        return new Promise((resolve, reject) => {
            var options = {
                method: 'GET',
                url: url,
                qs: qs,
                headers: {
                    Host: 'iprice.dev.cardinalhealth.net',
                    uid: 'kararu01',
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
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
        let customerUrl = `${this.url}` + `/iprice/open/customer`;
        console.log(customerUrl);
        let qs = {
            customerNumber: soldto
        };
        return this.createIPricePost(customerUrl, qs);
    }

    checkMaterialNum(matNum) {
        console.log(`Received Mat num -- ${matNum}`);
        let materialUrl = `${this.url}` + `/iprice/open/material`;
        let qs = {
            materialNumber: matNum
        };
        return this.createIPricePost(materialUrl, qs);
    }

    checkExistingPrice(priceQuote) {
        let qs = {
            customerNumber: priceQuote.soldto,
            materialNumber: priceQuote.cah_material,
            um: priceQuote.selected_uom,
            asOfDate: priceQuote.selected_date,
            dc:priceQuote.selected_dc
        };
        let pricequoteUrl = `${this.url}` + `/iprice/open/pricequote`;
        return this.createIPricePost(pricequoteUrl, qs);
    }

    checkProposalStatus(ProposalNumber) {
        let qs = {
            proposalId:ProposalNumber,
            returnLimit:10
        };
        let ProposalNumberUrl = `${this.url}` + `/iprice/open/proposal`;
        return this.createIPricePost(ProposalNumberUrl, qs);
    }
}

module.exports = iPrice;