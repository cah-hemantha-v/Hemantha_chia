const sql = require('mssql');
const watson = require('./watson');
const logger = require('../utils/logger');
const dbConfig = require('./db');

module.exports = class Discrepancy {

    constructor() {
        this.watson = new watson();
    }

    CheckValidInput() {
        logger.debug("Check Valid input Code called...");
        return new Promise((resolve, reject) => {
            this.watson.setContext("CheckValidInput", false);
            let primaryfilter = this.watson.getContext("primaryfilter");
            let custLookupValue = this.watson.getContext("custLookupValue");
            let primarytable = '';
            let addFilter = '';
            let CustName = '';

            if(primaryfilter === 'Soldto'){
                primarytable = 'IncLog_SoldtoAssignment';
                CustName = `, CustName, Pricing_Program, Pricing_Program_Effective_Date`;
            }
            else{
                primarytable = this.watson.getContext("primarytable");
                addFilter = `AdjMatch2='N' AND ManualOrderFlag='False' AND (BillingType='ZF2' OR BillingType='ZF3') AND`;
            }
            
            sql.connect(dbConfig).then(() => {
                return sql.query(`SELECT TOP 1 ${primaryfilter} ${CustName} FROM ${primarytable} WHERE ${addFilter} ${primaryfilter} ='${custLookupValue}';`)
            }).then((dbResultSet) => {
                console.log('result: ', dbResultSet);
                if (dbResultSet.rowsAffected[0] > 0) {
                    this.watson.setContext('validInputPresent', dbResultSet['recordset'][0]);
                    if(primaryfilter === 'Soldto' ){
                        this.watson.setContext('primaryfilter',"SoldtoCustomerNum");
                    }
                } else {
                    this.watson.setContext("InvalidInputErr", true);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
                sql.close();

            }).catch(err => {
                console.log('err: ', err);
                // ... error checks
                logger.error(err);
                sql.close();
                this.watson.setContext("submitdiscrepancyerr", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            })

        });
    }

    GetTop10Material() {
        logger.debug("Get top 10 material code called");
        return new Promise((resolve, reject) => {
            this.watson.setContext("GetTop10Material", false);
            let deltaqueryvalue = this.watson.getContext("custLookupValue");
            let primarytable = this.watson.getContext("primarytable");
            var addFilter = '';
            if (this.watson.getContext("primaryfilter") !== 'nocut') {
                var addFilter = `AND ${this.watson.getContext("primaryfilter")}='${deltaqueryvalue}'`;
            }

            sql.connect(dbConfig).then(() => {
                if (this.watson.getContext("top10type") === 'by count') {
                    var sqlQuery = sql.query(`Select Top 10 Count(${primarytable}.CAH_Material) As MatCount, ${primarytable}.CAH_Material, Material_Supplier_Cross.SupplierName 
                    From ${primarytable} Inner Join Material_Supplier_Cross On ${primarytable}.CAH_Material = Material_Supplier_Cross.CAH_Material Where 
                    ${primarytable}.BillingDocDate >= '${this.watson.getContext("billingdoc_fromdate")}' 
                    AND ${primarytable}.BillingDocDate <= '${this.watson.getContext("billingdoc_todate")}' ${addFilter} And ${primarytable}.BillingType In ('ZF2', 'ZF3') 
                    Group By ${primarytable}.CAH_Material, Material_Supplier_Cross.SupplierName Order By MatCount Desc;`)
                    
                } else {
                    var sqlQuery = sql.query(`Select Top 10 Sum(${primarytable}.Extended_Delta_Released_Refreshed) As ExtDeltaRefreshedSum, ${primarytable}.CAH_Material, 
                    Material_Supplier_Cross.SupplierName From ${primarytable} Inner Join Material_Supplier_Cross On ${primarytable}.CAH_Material = Material_Supplier_Cross.CAH_Material 
                    Where ${primarytable}.BillingDocDate >= '${this.watson.getContext("billingdoc_fromdate")}' 
                    AND ${primarytable}.BillingDocDate <= '${this.watson.getContext("billingdoc_todate")}' ${addFilter} And ${primarytable}.CEP != 0 And ${primarytable}.AdjMatch2 In ('N') 
                    And ${primarytable}.BillingType In ('ZF2', 'ZF3') And ${primarytable}.ManualOrderFlag In ('FALSE') Group By ${primarytable}.CAH_Material, Material_Supplier_Cross.SupplierName Order By ExtDeltaRefreshedSum DESC;`)
                }
                
                return sqlQuery

            }).then((dbResultSet) => {
                console.log('dbResultSet: ', dbResultSet);
                if (dbResultSet.rowsAffected[0] > 0) {
                    if (this.watson.getContext("top10type") === 'by count') {
                        this.GetTop10byCount(dbResultSet).then(data => {
                            this.watson.watsonPostMessage(data).then((value) => {
                                resolve(value);
                            })
                        });
                        sql.close();
                    } else {
                        sql.close();
                        this.GetCustomerFavor(dbResultSet).then(data => {
                            this.watson.watsonPostMessage(data).then((value) => {
                                resolve(value);
                            })
                        });
                    }
                } else {
                    this.watson.setContext("gettop10err",true);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                    sql.close();
                }
               
            }).catch(err => {
                console.log('err: ', err);
                // ... error checks
                logger.error(err);
                sql.close();
                this.watson.setContext("submitdiscrepancyerr", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            })

        })
    }

    GetTop10byCount(dbResultSet) {
        logger.debug("GetTop10byCount code called");
        return new Promise((resolve, reject) => {
            this.watson.setContext('Top10Results', dbResultSet['recordset']);
            let payloadArray = [];
                    payloadArray.push({
                        'type': 'table',
                        'values': []
                    },
                        {
                            'type': 'text',
                            'values': ['Would you like to do additional research?']
                        }, {
                        'type': 'button',
                        'values': ['yes', 'no']
                    });
                    let tableValues = [];
                    dbResultSet['recordset'].forEach(element => {
                        tableValues.push(
                            `<tr>
                        <td>${element.SupplierName}</td>
                        <td>${element.CAH_Material}</td>
                        <td>${element.MatCount}</td>
                    </tr>`)
                    });
                    tableValues = tableValues.join("");
                    payloadArray[0].values.push(
                        `<table> 
                        <thead>
                                 <tr>
                                       <th>Supplier Name</th>
                                       <th>CAH Material</th>
                                       <th>MatCount</th>
                                 </tr></thead>
                                        <tbody>
                                           ${tableValues}
                        </tbody>`
                    );
                    this.watson.setContext('chiapayload', payloadArray);
                    resolve(this.watson.response);

        })
    }

    GetExtendedDelta() {
        logger.debug("Get Extended delta code called");
        return new Promise((resolve, reject) => {
            this.watson.setContext("GetExtendedDelta", false);
            let primarytable = this.watson.getContext("primarytable");
            let deltaqueryvalue = this.watson.getContext("custLookupValue");

            sql.connect(dbConfig).then(() => {
                if (this.watson.getContext("primaryfilter") === 'CAH_Material') {
                    var sqlQuery = sql.query(`Select Sum(${primarytable}.Extended_Delta_Released_Refreshed) As 
                    ExtDeltaRefreshedSum, ${primarytable}.CAH_Material, Material_Supplier_Cross.SupplierName, 
                    ${primarytable}.MaterialDesc From ${primarytable} Inner Join Material_Supplier_Cross On 
                    ${primarytable}.CAH_Material = Material_Supplier_Cross.CAH_Material 
                    Where ${primarytable}.${this.watson.getContext("primaryfilter")} In ('${deltaqueryvalue}') And 
                    ${primarytable}.BillingDocDate >= '${this.watson.getContext("billingdoc_fromdate")}' AND ${primarytable}.BillingDocDate <= '${this.watson.getContext("billingdoc_todate")}' And ${primarytable}.CEP != 0 And 
                    ${primarytable}.AdjMatch2 In ('N') And ${primarytable}.BillingType In ('ZF2', 'ZF3') And 
                    ${primarytable}.ManualOrderFlag In ('FALSE') Group By ${primarytable}.CAH_Material, 
                    Material_Supplier_Cross.SupplierName, ${primarytable}.MaterialDesc;`)
                } else {
                    var sqlQuery = sql.query(`SELECT SUM(Extended_Delta_Released_Refreshed) As ExtDeltaRefreshedSum FROM ${primarytable} WHERE AdjMatch2='N' AND ManualOrderFlag='false' 
                    AND (BillingType='ZF2' OR BillingType='ZF3') AND BillingDocDate >= '${this.watson.getContext("billingdoc_fromdate")}' AND BillingDocDate <= '${this.watson.getContext("billingdoc_todate")}' 
                    AND ${this.watson.getContext("primaryfilter")}='${deltaqueryvalue}';`)
                }
                
               return sqlQuery

            }).then((dbResultSet) => {
                console.log('dbResultSet: ', dbResultSet);
                if (dbResultSet.rowsAffected[0] > 0) {
                    if (dbResultSet['recordset'][0].ExtDeltaRefreshedSum != null) {
                        this.watson.setContext('ExtendedDeltaResult', dbResultSet['recordset'][0]);

                    } else {
                        this.watson.setContext('ExtendedDeltaResult', `0`);
                    }
                }  else {
                    this.watson.setContext("getEDerr", true);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
                sql.close();
            }).catch(err => {
                console.log('err: ', err);
                // ... error checks
                logger.error(err);
                sql.close();
                this.watson.setContext("submitdiscrepancyerr", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            })

        })
    }

    GetCustomerFavor(dbResultSet) {
        logger.debug("Get GetCustomerFavor code called");
        return new Promise((resolve, reject) => {
            let primarytable = this.watson.getContext("primarytable");
            let deltaqueryvalue = this.watson.getContext("custLookupValue");
            var addFilter = '';
            if (this.watson.getContext("primaryfilter") !== 'nocut') {
                var addFilter = `AND ${this.watson.getContext("primaryfilter")}='${deltaqueryvalue}'`;
            }

            sql.connect(dbConfig).then(() => {
                
                return sql.query(`Select Top 10 Sum(${primarytable}.Extended_Delta_Released_Refreshed) As ExtDeltaRefreshedSum, ${primarytable}.CAH_Material, Material_Supplier_Cross.SupplierName 
                From ${primarytable} Inner Join Material_Supplier_Cross On ${primarytable}.CAH_Material = Material_Supplier_Cross.CAH_Material Where ${primarytable}.BillingDocDate >= '${this.watson.getContext("billingdoc_fromdate")}' 
                AND ${primarytable}.BillingDocDate <= '${this.watson.getContext("billingdoc_todate")}' ${addFilter} 
                And ${primarytable}.CEP != 0 And ${primarytable}.AdjMatch2 In ('N') And ${primarytable}.BillingType In ('ZF2', 'ZF3') And ${primarytable}.ManualOrderFlag In ('FALSE') 
                Group By ${primarytable}.CAH_Material, Material_Supplier_Cross.SupplierName Order By ExtDeltaRefreshedSum;`)

            }).then((custFavorResult) => {

                if (custFavorResult.rowsAffected[0] > 0) {
                    this.watson.setContext('Top10Results', custFavorResult['recordset']);
                    let payloadArray = [];
                    payloadArray.push({
                        'type': 'table',
                        'values': []
                    },
                        {
                            'type': 'text',
                            'values': ['Would you like to do additional research?']
                        }, {
                        'type': 'button',
                        'values': ['yes', 'no']
                    });
                    let tableValues = [];
                    dbResultSet['recordset'].forEach(element => {
                        tableValues.push(
                            `<tr>
                        <td>${element.SupplierName}</td>
                        <td>${element.CAH_Material}</td>
                        <td>${element.ExtDeltaRefreshedSum.toLocaleString('en-US',{style:'currency', currency: 'USD', maximumFractionDigits: 2})}</td>
                    </tr>`)
                    });
                    tableValues = tableValues.join("");
                    let custFavorValues = [];
                    custFavorResult['recordset'].forEach(element => {
                        custFavorValues.push(
                            `<tr>
                        <td>${element.SupplierName}</td>
                        <td>${element.CAH_Material}</td>
                        <td>${element.ExtDeltaRefreshedSum.toLocaleString('en-US',{style:'currency', currency: 'USD', maximumFractionDigits: 2})}</td>
                    </tr>`)
                    });
                    custFavorValues = custFavorValues.join("");
                    payloadArray[0].values.push(
                        `<table> 
                        <caption><b>In Cardinal’s Favor</b></caption>
                        <thead>
                                 <tr>
                                       <th>Supplier Name</th>
                                       <th>CAH Material</th>
                                       <th>Extended Delta</th>
                                 </tr></thead>
                                        <tbody>
                                           ${tableValues}
                        </tbody>
                        </table>
                        <table> 
                        <caption><b>In Customer’s Favor</b></caption>
                        <tbody>
                          ${custFavorValues}
                        </tbody>
                        </table>`
                    );
                    this.watson.setContext('chiapayload', payloadArray);
                } else {
                    this.watson.setContext("gettop10err", true);
                }
                resolve(this.watson.response);
                sql.close();
            }).catch(err => {
                console.log('err: ', err);
                // ... error checks
                logger.error(err);
                sql.close();
                this.watson.setContext("submitdiscrepancyerr", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            })

        })
    }


    CheckRootCauseInvoice() {
        logger.debug("Check Root Cause Invoice code called");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_RCD_Invoice", false);
            let billingDocNum = this.watson.getContext("RootCauseInvoice");

            sql.connect(dbConfig).then(() => {
                
                return sql.query(`Select Count(CAP_Billing.BillingDocNum) From CAP_Billing Where CAP_Billing.BillingDocNum In ('${billingDocNum}') Group By 
                CAP_Billing.BillingDocNum Union All Select Count(NonCAP_Billing.BillingDocNum) From NonCAP_Billing Where NonCAP_Billing.BillingDocNum In ('${billingDocNum}') 
                Group By NonCAP_Billing.BillingDocNum;`)

            }).then((dbResultSet) => {
                console.log('result: ', dbResultSet);
                if (dbResultSet.rowsAffected[0] > 0) {
                    
                   return sql.query(`Select CAP_Billing.BillingDocNum, CAP_Billing.CAH_Material From CAP_Billing Where CAP_Billing.AdjMatch2 In ('N') And CAP_Billing.BillingDocNum In ('${billingDocNum}') 
                   Union Select NonCAP_Billing.BillingDocNum, NonCAP_Billing.CAH_Material From NonCAP_Billing Where NonCAP_Billing.AdjMatch2 In ('N') And NonCAP_Billing.BillingDocNum In ('${billingDocNum}');`)
                   .then((invoiceResult)=>{

                    console.log('invoiceResult: ', invoiceResult);
                    this.watson.setContext('InvoiceValidated', true);

                    let payloadArray = [];
                    
                    payloadArray.push({
                        'type': 'button',
                        'values': []
                    });
                    
                    invoiceResult['recordset'].forEach(element => {
                        payloadArray[0].values.push(element.CAH_Material)
                    });
                    this.watson.setContext('chiapayload', payloadArray);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                    sql.close();
                   })
                } else {
                    this.watson.setContext("InvalidInputErr", true);
                    this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                        resolve(rest);
                    });
                    sql.close();
                }
             }).catch(err => {
                console.log('err: ', err);
                // ... error checks
                logger.error(err);
                sql.close();
                this.watson.setContext("submitdiscrepancyerr", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            })

        })
    }

    CheckRootCauseMaterial(){
        logger.debug("Get CheckRootCauseMaterial code called");
        return new Promise((resolve, reject) => {
            this.watson.setContext("Check_RCD_Material", false);
            let billingDocNum = this.watson.getContext("RootCauseInvoice");
            let materialNum = this.watson.getContext("RootCauseMaterial");

            sql.connect(dbConfig).then(() => {
                
               return sql.query(`Select CAP_Billing.BillingDocNum, CAP_Billing.CAH_Material, CAP_Billing.CAH_Price, CAP_Billing.CEP, CAP_Billing.CAH_Refreshed, 
               CAP_Billing.PQ_Cost_Agreement_Number, CAP_Billing.PQ_CostVendorContractNumber, CAP_Billing.PQ_CostGPOContractNumber, CAP_Billing.PQ_CostTier, 
               CAP_Billing.PCH_SUPPLIER_AGR_DESC, CAP_Billing.PCH_SUPPLIER_AGR_EXT_DESC, CAP_Billing.PCH_Comment2, CAP_Billing.PQ_Price_DA_Number, CAP_Billing.PQ_Price_DA_Desc, 
               CAP_Billing.PQ_Price_DA_Ext_Desc, CAP_Billing.PricingDate From CAP_Billing Where CAP_Billing.BillingDocNum In ('${billingDocNum}') And 
               CAP_Billing.CAH_Material In ('${materialNum}') Union Select NonCAP_Billing.BillingDocNum, NonCAP_Billing.CAH_Material, NonCAP_Billing.CAH_Price,
               NonCAP_Billing.CEP, NonCAP_Billing.CAH_Refreshed, NonCAP_Billing.PQ_Cost_Agreement_Number, NonCAP_Billing.PQ_CostVendorContractNumber, NonCAP_Billing.PQ_CostGPOContractNumber, NonCAP_Billing.PQ_CostTier, 
               NonCAP_Billing.PCH_SUPPLIER_AGR_DESC, NonCAP_Billing.PCH_SUPPLIER_AGR_EXT_DESC, NonCAP_Billing.PCH_Comment2, NonCAP_Billing.PQ_Price_DA_Number, NonCAP_Billing.PQ_Price_DA_Desc, 
               NonCAP_Billing.PQ_Price_DA_Ext_Desc, NonCAP_Billing.PricingDate From NonCAP_Billing Where NonCAP_Billing.BillingDocNum In ('${billingDocNum}') And 
               NonCAP_Billing.CAH_Material In ('${materialNum}');`)

            }).then((dbResultSet) => {
                console.log('dbResultSet: ', dbResultSet);
                if (dbResultSet.rowsAffected[0] > 0) {
            
                        this.watson.setContext('RootCauseResult', dbResultSet['recordset'][0]);

                }  else {
                    this.watson.setContext("getRCDerr", true);
                }
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
                sql.close();
            }).catch(err => {
                console.log('err: ', err);
                // ... error checks
                logger.error(err);
                sql.close();
                this.watson.setContext("submitdiscrepancyerr", true);
                this.watson.watsonPostMessage(this.watson.response).then((rest) => {
                    resolve(rest);
                });
            })

        })
    }

}
