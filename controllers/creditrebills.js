const sql = require('mssql');
const watson = require('./watson');
const logger = require('../utils/logger');
const dbConfig = require('./db');

module.exports = class CreditRebills {

    constructor() {
        this.watson = new watson();
    }

    checkServiceIssue() {
        logger.debug("Check Service Issue Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkServiceIssue', false);

            let serviceIssueNumber = this.watson.getContext('serviceIssueNumber');

            //call to Sql database to get
            sql.connect(dbConfig).then(() => {
                return sql.query `Select 
                RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
                RECENT_SI_DATA.STATUS_TEXT, 
                RECENT_SI_DATA.Soldto, 
                RECENT_SI_DATA.SoldtoName, 
                RECENT_SI_DATA.ReferenceInvoice, 
                RECENT_SI_DATA.CREDIT_MEMO 
                From RECENT_SI_DATA 
                Where RECENT_SI_DATA.SERVICE_ISSUE_NUMBER = ${serviceIssueNumber.service_issue_number}`
            }).then((dbResultSet) => {
                //logger.debug(dbResultSet);
                if (dbResultSet === undefined || dbResultSet['recordsets'][0].length == 0) {
                    this.watson.setContext('serviceIssueErr', 'We are unable to find your service issue');
                }
                else {
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('serviceIssueErr', false);
                    this.watson.setContext('validServiceIssue', dbResultSet['recordsets'][0]);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
                sql.close();
            }).catch((err) => {
                logger.error(err);
                sql.close();
                this.watson.setContext("serviceIssueErr", err);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }


    checkInvoiceNumber() {
        logger.debug("Check Invoice number Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkInvoiceNumber', false);

            let invoiceNumber = this.watson.getContext('invoiceNumber');

            sql.connect(dbConfig).then(() => {
                return sql.query `Select 
                RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
                RECENT_SI_DATA.STATUS_TEXT, 
                RECENT_SI_DATA.Soldto, 
                RECENT_SI_DATA.SoldtoName, 
                RECENT_SI_DATA.ReferenceInvoice, 
                RECENT_SI_DATA.CREDIT_MEMO 
                From RECENT_SI_DATA 
                Where RECENT_SI_DATA.ReferenceInvoice = ${invoiceNumber.invoice_number}`
            }).then((dbResultSet) => {

                if (dbResultSet === undefined || dbResultSet['recordsets'][0].length == 0) {
                    this.watson.setContext('invoiceNumberErr', 'We are unable to find your invoice number');
                }
                else {
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('invoiceNumberErr', false);
                    this.watson.setContext('validInvoiceNumber', dbResultSet['recordsets'][0]);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
                sql.close();
            }).catch((err) => {
                logger.error(err);
                sql.close();
                this.watson.setContext('invoiceNumberErr', err);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    checkMaterialNumber() {
        logger.debug("Check Material number Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkMaterial', false);

            let materialNumber = this.watson.getContext('materialNumber');
            sql.connect(dbConfig).then(() => {
                return sql.query `Select 
                RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
                RECENT_SI_DATA.STATUS_TEXT, 
                RECENT_SI_DATA.Soldto, 
                RECENT_SI_DATA.SoldtoName, 
                RECENT_SI_DATA.ReferenceInvoice, 
                RECENT_SI_DATA.CREDIT_MEMO 
                From RECENT_SI_DATA 
                Where RECENT_SI_DATA.ReferenceInvoice = ${materialNumber.invoice_number}
                And RECENT_SI_DATA.Material = ${materialNumber.material_number}`
            }).then((dbResultSet) => {
                console.log("dbResult",dbResultSet);
                if (dbResultSet === undefined || dbResultSet['recordsets'][0].length == 0) {
                    this.watson.setContext('materialNumberErr', 'We are unable to find your material number');
                }
                else {
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('materialNumberErr', false);
                    this.watson.setContext('validMaterialNumber', dbResultSet['recordsets'][0]);

                    //set the validServiceIssue context as it is common for all 3 scenarios
                    this.watson.setContext('validServiceIssue', dbResultSet['recordsets'][0]);
                }

                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
                sql.close();
            }).catch((err) => {
                logger.error(err);
                sql.close();
                this.watson.setContext('materialNumberErr', err);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    checkLastTenSoldTo(){
        logger.debug("Check Last 10 Soldto Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkLastTenSoldTo', false);

            let lastTenSoldToNumber = this.watson.getContext('lastTenSoldToNumber');
            let soldToNumber = lastTenSoldToNumber.soldto;
            if(soldToNumber.length === 10 && soldToNumber.substring(0,2) === '00'){
                soldToNumber = soldToNumber.substring(2);
            }
            

                        //call to Sql database to get
                        sql.connect(dbConfig).then(() => {
                            return sql.query `Select Top 10 
                            RECENT_SI_DATA.STATUS_TEXT, 
                            RECENT_SI_DATA.SERVICE_ISSUE_NUMBER, 
                            RECENT_SI_DATA.Soldto, 
                            RECENT_SI_DATA.SoldtoName, 
                            RECENT_SI_DATA.ReferenceInvoice, 
                            RECENT_SI_DATA.CREDIT_MEMO 
                            From RECENT_SI_DATA 
                            Where RECENT_SI_DATA.Soldto = ${soldToNumber} 
                            Order By RECENT_SI_DATA.SI_Date Desc`
                        }).then((dbResultSet) => {
                            //logger.debug(dbResultSet);
                            
                            
                            if(dbResultSet === undefined || dbResultSet['recordsets'][0].length == 0){
                                this.watson.setContext('lastTenSoldToErr', 'We are unable to find your Soldto number');
                            }
                            else{
                                this.watson.setContext('counter', 0);
                                this.watson.setContext('lastTenSoldToErr', false);
                                let payloadArray = [];
                                payloadArray.push({
                                    'type': 'table',
                                    'values': []
                                },
                                {
                                    'type': 'text',
                                    'values': ['Would you like to check onanother service issue?']
                                }, {
                                    'type': 'button',
                                    'values': ['yes', 'no']
                                });

                                dbResultSet['recordsets'][0].forEach(element => {
                                    payloadArray[0].values.push(
                                        `<table style='width: 100%;' border='1' cellpadding='10'>
                                            <tbody>
                                                <tr>
                                                    <td>Customer Name</td>
                                                    <td>${element.SoldtoName}</td>
                                                </tr>
                                                <tr>
                                                    <td>Customer Soldto</td>
                                                    <td>${element.Soldto}</td>
                                                </tr>
                                                <tr>
                                                    <td>Reference</td>
                                                    <td>${element.ReferenceInvoice}</td>
                                                </tr>
                                                <tr>
                                                    <td>Service Issue</td>
                                                    <td>${element.SERVICE_ISSUE_NUMBER}</td>
                                                </tr>
                                                <tr>
                                                    <td>Status</td>
                                                    <td>${element.STATUS_TEXT}</td>
                                                </tr>
                                                <tr>
                                                    <td>Net Credit</td>
                                                    <td>${element.CREDIT_MEMO}</td>
                                                </tr>
                                            </tbody>
                                        </table>`
                                    );
                                });

                                this.watson.setContext('chiapayload', payloadArray);
                                this.watson.setContext('validSoldTo', dbResultSet['recordsets'][0]);

                                 //set the validServiceIssue context as it is common for all 3 scenarios
                                //this.watson.setContext('validServiceIssue', dbResultSet[0][0]);
                            }
                            
                           this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                            resolve(rest);
                            });
                            sql.close();
                        }).catch((err) => {
                            logger.error(err);
                            sql.close();
                            this.watson.setContext("lastTenSoldToErr", err);
                            this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                                resolve(rest);
                            });
                        });
        });

    }
}
