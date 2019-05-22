'use strict';
const request = require("request");
const logger = require('../utils/logger');

module.exports = class iPrice {
    constructor(uid) {
        this.url = process.env.IPRICE_HOST || 'https://api.dev.cardinalhealth.com';
        this.uid = uid || "kararu01";
        this.headers = {
            'Host': 'api.dev.cardinalhealth.com',
            'uid': this.uid,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': process.env.APIGEE_APIKEY || 'CfeAcU7rFW0EoMhHUAq0mAi86XSmlO4p'
        }
    }

    setUid(uid) {
        this.uid = uid;
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

            request(options, (error, response, body) => {
                if (!error) {
                    if (response.statusCode == 200) resolve(response.body);
                    else if (response.statusCode == 404) reject(response.body);
                } else reject(error);
            });
        });
    }

    checkSoldToCustomer(soldto) {
        logger.debug("inside check sold to customer method");
        return new Promise((resolve, reject) => {
            const customerUrl = `${this.url}/medical-iprice-customer`;
            const qs = {
                customerNumber: soldto
            };
            resolve(this.getIPrice(customerUrl, qs));
        })
    }

    checkMaterialNum(matNum) {
        logger.debug("inside check material num method");
        const materialUrl = `${this.url}/medical-iprice-material`;
        const qs = {
            materialNumber: matNum
        };
        return this.getIPrice(materialUrl, qs);
    }

    checkExistingPrice(priceQuote) {
        logger.debug("inside check existing price method");
        const pricequoteUrl = `${this.url}/medical-iprice-proposal`;
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
        const ProposalNumberUrl = `${this.url}/medical-iprice-proposal/status`;
        const qs = {
            proposalId: ProposalNumber,
            returnLimit: 10
        };
        return this.getIPrice(ProposalNumberUrl, qs);
    }
}