const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');
module.exports = class Reports {
    constructor() {
        this.iprice = new iPrice();
        this.watson = new watson();
    }

    checkPriceBook() {
        logger.debug("Check Pricebook Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_PriceBook", false);
            let customerNumber;
            if (this.watson.getContext('customerType') === 'lcn') {
                customerNumber = this.watson.getContext('lcn')
            } else {
                customerNumber = this.watson.getContext('soldto')
            }
            //let customerNumber = this.watson.getContext("soldto") != null ? this.watson.getContext("soldto") : this.watson.getContext("lcn");
            this.iprice.checkSoldToCustomer(customerNumber).then((soldToBody) => {
                console.log(soldToBody);
                if (soldToBody.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    this.watson.setContext("checkpricebookerr", false);
                    this.watson.setContext("validCustomerNumber", soldToBody.result);
                } else if (soldToBody.statusCode == 404) {
                    this.watson.setContext("checkpricebookerr", soldToBody.result.errorMessage);
                    console.log(this.watson.response);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            }).catch((err) => {
                logger.error(err);
                this.watson.setContext("checkpricebookerr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    submitPriceBookRequest() {
        logger.debug("Submit Pricebook request Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Submit_PriceBook", false);
            let submitPriceBook = this.watson.getContext("submitpricebook");
            this.iprice.submitPriceCatalog(submitPriceBook).then((submitResponse) => {
                if (submitResponse.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    this.watson.setContext("submitpricebookerr", false);
                    this.watson.setContext("submitPriceBookResponse", submitResponse.result);
                } else if (submitResponse.statusCode == 404) {
                    this.watson.setContext("submitpricebookerr", submitResponse.result.errorMessage);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            }).catch((err) => {
                logger.error(err);
                this.watson.setContext("submitpricebookerr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }
}