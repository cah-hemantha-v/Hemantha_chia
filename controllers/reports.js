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

    checkPriceBook(uid) {
        logger.debug("Check Pricebook Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_PriceBook", false);
            let customerNumber;
            if (this.watson.getContext('customerType') === 'lcn') {
                customerNumber = this.watson.getContext('lcn');
            } else {
                customerNumber = this.watson.getContext('soldto');
            }
            this.iprice.checkSoldToCustomer(customerNumber).then((soldToBody) => {
                logger.info(`soldto response`);
                logger.debug(soldToBody);
                if (soldToBody.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    this.watson.setContext("checkpricebookerr", false);
                    this.watson.setContext("validCustomerNumber", soldToBody.result);
                    console.log(this.watson.getContext('submitreport'));
                    if (this.watson.getContext('submitreport')) {
                        this.submitReportRequest(uid).then(data => {
                            this.watson.watsonPostMessage(data).then((value) => {
                                resolve(value);
                            })
                        })
                    } else {
                        this.watson.watsonPostMessage(this.watson.response).then((value1) => {
                            resolve(value1);
                        })
                    }
                } else if (soldToBody.statusCode == 404) {
                    this.watson.setContext("checkpricebookerr", soldToBody.result.errorMessage);
                    console.log(this.watson.response);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                }
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
                if (submitResponse.statusCode == 300) {
                    let positionCodes = [];
                    this.watson.setContext('hasMultiPosition', true);
                    submitResponse.result.positions.forEach(element => {
                        positionCodes.push(`${element.positionCode} (${element.saleItemGroupDesc})`);
                    });
                    submitResponse.result.positions = positionCodes;
                    this.watson.setContext('positioncodes', submitResponse.result);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });

                } else if (submitResponse.statusCode == 200) {
                    this.watson.setContext("counter", 0);
                    this.watson.setContext("submitpricebookerr", false);
                    this.watson.setContext("submitPriceBookResponse", submitResponse.result);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                } else if (submitResponse.statusCode == 404) {
                    this.watson.setContext("submitpricebookerr", submitResponse.result.errorMessage);
                }
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
                    if (dbResultSet.rowsAffected[0] == 1) {
                        this.watson.setContext("isReportSubmitted", true);
                    } else {
                        this.watson.setContext("submitreporterr", true);
                    }
                    resolve(this.watson.response);
                    sql.close();
                }).catch(err => {
                    // ... error checks
                    logger.error(err);
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