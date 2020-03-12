'use strict';
const request = require("request");
const logger = require('../utils/logger');

module.exports = class iPrice {
    constructor(uid) {
        this.url = process.env.IPRICE_HOST || 'http://iprice.dev.cardinalhealth.net';
        this.uid = uid;
        this.headers = {
            'uid': this.uid,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + process.env.IPRICE_CREDS
        }
    }

    setUid(uid) {
        this.uid = uid;
        this.headers.uid = uid;
    }

    getIPrice(url, qs) {
        logger.debug("4. Inside getIPrice() method.");
        return this.createIPricePost(url, qs, "GET");
    }

    PostIPrice(url, qs) {
        logger.debug("4. Inside PostIPrice() method.");
        return this.createIPricePost(url, qs, "POST");
    }

    deleteIprice(url, qs) {
        logger.debug("4. Inside deleteIprice() method.");
        return this.createIPricePost(url, qs, 'DELETE');
    }

    putIprice(url, qs) {
        logger.debug("4. Inside putIprice() method.");
        return this.createIPricePost(url, qs, "PUT");
    }

    createIPricePost(url, qs, method) {
        logger.debug("5. Inside createIPricePost() method.");
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                url: url,
                qs: qs,
                headers: this.headers
            };
            logger.debug(`options--${JSON.stringify(options)}`);
            request(options, (error, response, body) => {
                if (!error) {
                    logger.info(`Printing iPrice body`);
                    logger.debug(response.statusCode);
                    let respBody = JSON.parse(body);
                    logger.info(`iPrice Response-- ${response.statusCode}`);
                    logger.debug(respBody);
                    respBody.statusCode = response.statusCode;
                    if (response.statusCode == 200 || response.statusCode == 300 || response.statusCode == 404) resolve(respBody);
                    else if (response.statusCode == 403 || response.statusCode == 401 || response.statusCode == 502 || response.statusCode == 500) reject(respBody);
                } else {
                    logger.error('Error occured while making iPrice API call.');
                    logger.error(error);
                    reject(error);
                }
            });
        });
    }

    checkSoldToCustomer(soldto) {
        logger.debug("3. Inside checkSoldToCustomer() function.");
        return new Promise((resolve, reject) => {
            const customerUrl = `${this.url}/iprice/api/customer`;
            const qs = {
                customerNumber: soldto
            };
            resolve(this.getIPrice(customerUrl, qs));
        })
    }

    checkMaterialNum(matNum) {
        logger.debug("3. Inside checkMaterialNum() function.");
        const materialUrl = `${this.url}/iprice/api/material`;
        const qs = {
            materialNumber: matNum
        };
        return this.getIPrice(materialUrl, qs);
    }

    checkExistingPrice(checkpricing) {
        logger.debug("3. Inside checkExistingPrice() function.");
        const pricequoteUrl = `${this.url}/iprice/api/proposal`;
        const qs = {
            customerNumber: checkpricing.soldto,
            materialNumber: checkpricing.cah_material,
            um: checkpricing.selected_uom,
            asOfDate: checkpricing.selected_date,
            dc: checkpricing.selected_dc,
            workspace: checkpricing.workspace
        };
        return this.PostIPrice(pricequoteUrl, qs);
    }

    checkProposalStatus(proposal_status) {
        logger.debug("3. Inside checkProposalStatus() function.");
        const ProposalNumberUrl = `${this.url}/iprice/api/proposal/status`;
        const qs = {
            proposalId: proposal_status.proposal_number,
            returnLimit: 9,
            workspace: proposal_status.workspace
        };
        console.log('qs', qs);  //
        console.log('ProposalNumberUrl',ProposalNumberUrl); //
        return this.getIPrice(ProposalNumberUrl, qs);
    }

    checkMembershipAgreement(soldto, material) {
        logger.debug("3. Inside checkMembershipAgreement() function.");
        const membershipUrl = `${this.url}/iprice/api/contract`;
        const qs = {
            customerNumber: soldto,
            materialNumber: material
        };
        return this.getIPrice(membershipUrl, qs);
    }

    deleteProposal(deleteObj) {
        logger.debug("3. Inside deleteProposal() function.");
        const proposalDelUrl = `${this.url}/iprice/api/proposal`;
        const qs = {
            proposalId: deleteObj.pid,
            workspace: deleteObj.workspace
        }
        return this.deleteIprice(proposalDelUrl, qs);
    }

    updatePricingProposal(submitProposal) {
        logger.debug("3. Inside updatePricingProposal() function.");
        const proposalUrl = `${this.url}/iprice/api/proposal`;
        const qs = {
            proposalId: submitProposal.proposalId,
            lineNum: submitProposal.lineNum,
            loadAs: submitProposal.loadAs,
            amount: submitProposal.amount,
            fromDate: submitProposal.start_date,
            toDate: submitProposal.end_date,
            prcMessage: submitProposal.prcMessage,
            workspace: submitProposal.workspace
        };
        return this.putIprice(proposalUrl, qs);
    }

    submitPricingProposal(submitProposal) {
        logger.debug("3. Inside submitPricingProposal() function.");
        const proposalsubmitUrl = `${this.url}/iprice/api/proposal/submit`;
        const qs = {
            proposalId: submitProposal.proposalId,
            lineNum: submitProposal.lineNum,
            governanceReason: submitProposal.governanceReason,
            workspace: submitProposal.workspace
        };
        return this.PostIPrice(proposalsubmitUrl, qs);
    }

    submitPriceCatalog(submitPriceBook) {
        logger.debug("inside submit pricebook request");
        const pricebooksubmitUrl = `${this.url}/iprice/api/report/priceCatalogCompare`;
        const qs = {
            customerNumber: submitPriceBook.customerNumber,
            productType: submitPriceBook.productType,
            baseDate: submitPriceBook.baseDate,
            compareDate: submitPriceBook.compareDate,
            workspace: submitPriceBook.workspace
        };
        return this.PostIPrice(pricebooksubmitUrl, qs);
    }
}