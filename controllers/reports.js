const sql = require('mssql');
const watson = require('./watson');
const iPrice = require('./iPrice');
const logger = require('../utils/logger');
const ServiceNow = require('./snowhelper');
const dbConfig = require('./db');

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

    submitReportRequest(uid) {
        logger.debug("Submit Report request Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Submit_Report", false);
            ServiceNow.getUserProfile(uid).then((result) => {
                let userEmail = result[0].email;
                let Source = 'CHIA';
                let sR = this.watson.getContext("submitreport");
                sql.connect(dbConfig).then(() => {
                    return sql.query `insert into Chatbot (UniqueID,Source,Requestor,Timestamp,ReportType,Soldto,ContractTypes,
                        GPO,UsageTimeframe,ReportStartDate,ReportEndDate,RequestText) values 
                  (${sR.UniqueID},${Source},${userEmail},${sR.Timestamp},${sR.ReportType},${sR.Soldto},${sR.ContractTypes},${sR.GPO},
                   ${sR.UsageTimeframe},${sR.ReportStartDate},${sR.ReportEndDate},${sR.RequestText})`
                }).then((dbResultSet) => {
                    if(dbResultSet.rowsAffected[0] == 1){
                    this.watson.setContext("isReportSubmitted", true);
                    }
                    else {
                        this.watson.setContext("submitreporterr", true);
                    }
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                    sql.close();
                }).catch(err => {
                    // ... error checks
                    console.log(err)
                    this.watson.setContext("submitreporterr", true);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                })
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });
        });
    }
}