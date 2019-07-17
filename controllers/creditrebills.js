const watson = require('./watson');
const logger = require('../utils/logger');
const db = require('../dbUtility/db');

module.exports = class CreditRebills{

    constructor(){
        this.watson = new watson();
    }

    checkServiceIssue(){
        logger.debug("Check Service Issue Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkServiceIssue', false);
            
            let serviceIssueNumber = this.watson.getContext('serviceIssueNumber');
            
            //call to Sql database to get

            db.executeQuery(`Select 
            RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
            RECENT_SI_DATA.STATUS_TEXT, 
            RECENT_SI_DATA.Soldto, 
            RECENT_SI_DATA.SoldtoName, 
            RECENT_SI_DATA.ReferenceInvoice, 
            RECENT_SI_DATA.CREDIT_MEMO 
            From RECENT_SI_DATA 
            Where RECENT_SI_DATA.SERVICE_ISSUE_NUMBER = '${serviceIssueNumber.service_issue_number}'`)
            .then((dbResultSet) => {
                //logger.debug(dbResultSet);
                
                if(dbResultSet === undefined || dbResultSet[0].length == 0){
                    this.watson.setContext('serviceIssueErr', 'We are unable to find your service issue');
                }
                else{
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('serviceIssueErr', false);
                    this.watson.setContext('validServiceIssue', dbResultSet[0][0]);
                }
                
                /*
               [[ { SERVICE_ISSUE_NUMBER1: '6002078349',
    STATUS_TEXT: 'Completed',
    Soldto: '10000003',
    SoldtoName: 'DIGNITY ST JOSEPHS HOSPITAL PHOENIX',
    ReferenceInvoice: '7094172176',
    CREDIT_MEMO: '7102660716' } ]]
                */

               this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                resolve(rest);
                });
            }).catch((err) => {
                logger.error(err);
                this.watson.setContext("serviceIssueErr", err.result.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
    });
    }


    checkInvoiceNumber(){
        logger.debug("Check Invoice number Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkInvoiceNumber', false);

            let invoiceNumber = this.watson.getContext('invoiceNumber');

            db.executeQuery(`Select 
            RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
            RECENT_SI_DATA.STATUS_TEXT, 
            RECENT_SI_DATA.Soldto, 
            RECENT_SI_DATA.SoldtoName, 
            RECENT_SI_DATA.ReferenceInvoice, 
            RECENT_SI_DATA.CREDIT_MEMO 
            From RECENT_SI_DATA 
            Where RECENT_SI_DATA.ReferenceInvoice = '${invoiceNumber.invoice_number}'`)
            .then((dbResultSet) => {

                if(dbResultSet === undefined || dbResultSet[0].length == 0){
                    this.watson.setContext('invoiceNumberErr', 'We are unable to find your invoice number');
                }
                else{
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('invoiceNumberErr', false);
                    this.watson.setContext('validInvoiceNumber', dbResultSet[0][0]);
                }
                

                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                    });

            }).catch((err) => {
                logger.error(err);
                this.watson.setContext('invoiceNumberErr', err.errorMessage);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            });
        });
    }

    checkMaterialNumber(){
        logger.debug("Check Invoice number Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext('checkMaterial', false);

            let materialNumber = this.watson.getContext('materialNumber');

            db.executeQuery(`Select 
            RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
            RECENT_SI_DATA.STATUS_TEXT, 
            RECENT_SI_DATA.Soldto, 
            RECENT_SI_DATA.SoldtoName, 
            RECENT_SI_DATA.ReferenceInvoice, 
            RECENT_SI_DATA.CREDIT_MEMO 
            From RECENT_SI_DATA 
            Where RECENT_SI_DATA.ReferenceInvoice = '${materialNumber.invoice_number}'
            And RECENT_SI_DATA.Material = '${materialNumber.material_number}'`)
            .then((dbResultSet) => {

                if(dbResultSet === undefined || dbResultSet[0].length == 0){
                    this.watson.setContext('materialNumberErr', 'We are unable to find your material number');
                }
                else{
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('materialNumberErr', false);
                    this.watson.setContext('validMaterialNumber', dbResultSet[0][0]);

                    //set the validServiceIssue context as it is common for all 3 scenarios
                    this.watson.setContext('validServiceIssue', dbResultSet[0][0]);
                }
                
    
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                    });
            }).catch((err) => {
                logger.error(err);
                this.watson.setContext('materialNumberErr', err.result.errorMessage);
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

                        //call to Sql database to get

                        db.executeQuery(`Select 
                        RECENT_SI_DATA.SERVICE_ISSUE_NUMBER As SERVICE_ISSUE_NUMBER1, 
                        RECENT_SI_DATA.STATUS_TEXT, 
                        RECENT_SI_DATA.Soldto, 
                        RECENT_SI_DATA.SoldtoName, 
                        RECENT_SI_DATA.ReferenceInvoice, 
                        RECENT_SI_DATA.CREDIT_MEMO 
                        From RECENT_SI_DATA 
                        Where RECENT_SI_DATA.Soldto = '${lastTenSoldToNumber.soldto}'`)
                        .then((dbResultSet) => {
                            //logger.debug(dbResultSet);
                            
                            
                            if(dbResultSet === undefined || dbResultSet[0].length == 0){
                                this.watson.setContext('lastTenSoldToErr', 'We are unable to find your Soldto number');
                            }
                            else{
                                this.watson.setContext('counter', 0);
                                this.watson.setContext('lastTenSoldToErr', false);
                                this.watson.setContext('validSoldTo', dbResultSet[0][0]);

                                 //set the validServiceIssue context as it is common for all 3 scenarios
                                this.watson.setContext('validServiceIssue', dbResultSet[0][0]);
                            }
                            
                           this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                            resolve(rest);
                            });
                        }).catch((err) => {
                            logger.error(err);
                            this.watson.setContext("lastTenSoldToErr", err.result.errorMessage);
                            this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                                resolve(rest);
                            });
                        });
        });

    }
}
