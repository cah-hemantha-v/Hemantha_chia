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
            let customerNumber = this.watson.getContext("soldto") != null? this.watson.getContext("soldto") : this.watson.getContext("lcn");
            this.iprice.checkSoldToCustomer(customerNumber).then((soldToBody) => {
                this.watson.setContext("counter", 0);
                this.watson.setContext("checkpricebookerr", false);
                const customer_info = JSON.parse(soldToBody);
                this.watson.setContext("validCustomerNumber", customer_info.result);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            }).catch((err) => {
                logger.error(err);
                const errMessage = JSON.parse(err);
                this.watson.setContext("checkpricebookerr", errMessage.result.errorMessage);
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
                this.watson.setContext("counter", 0);
                this.watson.setContext("submitpricebookerr", false);
                const submit_info = JSON.parse(submitResponse);
                this.watson.setContext("submitPriceBookResponse", submit_info.result);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            }).catch((err) => {
                logger.error(err);
                const errMessage = JSON.parse(err);
                this.watson.setContext("submitpricebookerr", errMessage.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }
}
