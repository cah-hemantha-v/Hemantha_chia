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
            //Customer Name: <CustomerName>
            //Customer Soldto: <CustomerSoldto>
            //Reference: <ReferenceInvoice>
            //Service Issue: <ServiceIssueNumber>
            //Status: <CurrentStatus>
            //Net Credit: <NetCredit></NetCredit>

            db.executeQuery('SELECT TOP 10 * FROM RECENT_SI_DATA').then((dbResultSet) => {
                logger.debug(dbResultSet);
                if(serviceIssueNumber.service_issue_number === 12345678){
                
                    this.watson.setContext('counter', 0);
                    this.watson.setContext('serviceIssueErr', false);
    
                    this.watson.response.output.text[1] = 'Customer Name: <CustomerName>';
                    this.watson.response.output.text[2] = 'Customer Soldto: <CustomerSoldto>';
                    this.watson.response.output.text[3] = 'Reference: <ReferenceInvoice>';
                    this.watson.response.output.text[4] = 'Service Issue: <ServiceIssueNumber>';
                    this.watson.response.output.text[5] = 'Status: <CurrentStatus>';
                    this.watson.response.output.text[6] = 'Net Credit: <NetCredit></NetCredit>';
    
                   // resolve(this.watson.response);
                    
                }
    
                else{
                    let errorMessage = 'We could not find the Service Issue details. Please try again.'
                    this.watson.setContext('serviceIssueErr', errorMessage);
                    this.watson.response.output.text[0] = errorMessage;
                    
                }
    
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });

            });


        });
    }
}
