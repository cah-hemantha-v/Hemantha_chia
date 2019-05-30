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
            'Authorization': 'Basic '+ process.env.IPRICE_CREDS
        }
    }

    setUid(uid) {
        this.uid = uid;
        this.headers.uid = uid;
    }

    getIPrice(url, qs) {
        logger.debug("inside get iprice method");
        return this.createIPricePost(url, qs, "GET");
    }

    PostIPrice(url, qs) {
        logger.debug("inside post iprice method");
        return this.createIPricePost(url, qs, "POST");
    }

    createIPricePost(url, qs, method) {
        logger.debug("inside create iprice post method");
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                url: url,
                qs: qs,
                headers: this.headers
            };
            logger.debug(options);
            request(options, (error, response, body) => {
                if (!error) {
                    logger.info(response);
                    if (response.statusCode == 200) resolve(response.body);
                    else if (response.statusCode == 404 || response.statusCode == 403 || response.statusCode == 401 || response.statusCode == 502) reject(response.body);
                } else reject(error);
            });
        });
    }

    checkSoldToCustomer(soldto) {
        logger.debug("inside check sold to customer method");
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
}