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
        logger.debug("called getIPrice..");
        return this.createIPricePost(url, qs, "GET");
    }

    PostIPrice(url, qs) {
        logger.debug("inside post iprice method");
        return this.createIPricePost(url, qs, "POST");
    }

    deleteIprice(url, qs) {
        logger.debug('Inside delete iPrice method');
        return this.createIPricePost(url, qs, 'DELETE');
    }

    putIprice(url, qs) {
        logger.debug("inside put iprice method");
        return this.createIPricePost(url, qs, "PUT");
    }

    createIPricePost(url, qs, method) {
        logger.debug("called createIPricePost method");
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                url: url,
                qs: qs,
                headers: this.headers
            };
            logger.info(`Printing Options, ${options}`);
            request(options, (error, response, body) => {
                logger.info(response);
                if (!error) {
                    if (response.statusCode == 200) resolve(response.body);
                    else if (response.statusCode == 404 || response.statusCode == 403 || response.statusCode == 401 || response.statusCode == 502) reject(response.body);
                } else {
                    logger.error('Error occured while making iPrice API call.');
                    logger.error(error);
                    reject(error);
                }
            });
        });
    }

    checkSoldToCustomer(soldto) {
        logger.debug("Called checkSoldToCustomer..");
        return new Promise((resolve, reject) => {
            const customerUrl = `${this.url}/iprice/api/customer`;
            const qs = {
                customerNumber: soldto
            };
            resolve(this.getIPrice(customerUrl, qs));
        })
    }

    checkMaterialNum(matNum) {
        logger.debug("inside check material num method");
        const materialUrl = `${this.url}/iprice/api/material`;
        const qs = {
            materialNumber: matNum
        };
        return this.getIPrice(materialUrl, qs);
    }

    checkExistingPrice(priceQuote) {
        logger.debug("inside check existing price method");
        const pricequoteUrl = `${this.url}/iprice/api/proposal`;
        const qs = {
            customerNumber: priceQuote.soldto,
            materialNumber: priceQuote.cah_material,
            um: priceQuote.selected_uom,
            asOfDate: priceQuote.selected_date,
            dc: priceQuote.selected_dc
        };
        return this.PostIPrice(pricequoteUrl, qs);
    }

    checkProposalStatus(ProposalNumber) {
        logger.debug("inside check propsosal status method");
        const ProposalNumberUrl = `${this.url}/iprice/api/proposal/status`;
        const qs = {
            proposalId: ProposalNumber,
            returnLimit: 10
        };
        return this.getIPrice(ProposalNumberUrl, qs);
    }

    checkMembershipAgreement(soldto, material) {
        logger.debug("inside check membership agreement method");
        const membershipUrl = `${this.url}/iprice/api/contract`;
        const qs = {
            customerNumber: soldto,
            materialNumber: material
        };
        return this.getIPrice(membershipUrl, qs);
    }

    deleteProposal(pid) {
        logger.debug('Inside Delete Proposal Method');
        const proposalDelUrl = `${this.url}/iprice/api/proposal`;
        const qs = {
            proposalId: pid
        }
        return this.deleteIprice(proposalDelUrl, qs);
    }
    
    updatePricingProposal(submitProposal) {
        logger.debug("inside updating pricing for specific proposal");
        const proposalUrl = `${this.url}/iprice/api/proposal`;
        const qs = {
            proposalId: submitProposal.proposalId,
            lineNum: submitProposal.lineNum,
            loadAs: submitProposal.loadAs,
            amount: submitProposal.amount,
            fromDate: submitProposal.start_date,
            toDate: submitProposal.end_date,
            prcMessage: submitProposal.prcMessage
        };
        return this.putIprice(proposalUrl, qs);
    }

    submitPricingProposal(submitProposal) {
        logger.debug("inside submit proposal for specific proposal");
        const proposalsubmitUrl = `${this.url}/iprice/api/proposal/submit`;
        const qs = {
            proposalId: submitProposal.proposalId,
            lineNum: submitProposal.lineNumber,
            governanceReason: submitProposal.governanceReason
        };
        return this.PostIPrice(proposalsubmitUrl, qs);
    }
}