const AssistantV1 = require('ibm-watson/assistant/v1');
const logger = require('../utils/logger');

module.exports = class Watson {
    constructor(request, response) {
        this.request = request || {};
        this.response = response || {};
        this.version = '2018-02-16';
        this.workspace_id = 'c6d87b7f-c012-4a4d-91bc-e7985605fc29';
        this.url = 'https://gateway.watsonplatform.net/assistant/api';
        this.iam_apikey = process.env.WATSON_APIKEY || 'ez8kLq0zcCsq_l8CZ5EKK9YoS3rljftGM6RVz2OTSTtr';
        this.assistant = new AssistantV1({
            version: this.version,
            iam_apikey: this.iam_apikey,
            url: this.url
        });
    }

    watsonPostMessage() {
        return new Promise((resolve, reject) => {
            logger.debug("inside watsonpostmessage method");

            const payload = {
                workspace_id: this.workspace_id,
                context: this.request.body.context || {},
                input: this.request.body.input || {}
            };

            this.assistant.message(payload, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            })
        })
    }

    getContext(context) {
        try {
            return (this.response.context[context]) ? this.response.context[context] : null;
        } catch (err) {
            return null;
        }
    }

    setContext(context_name, value) {
        try {
            this.response.context[context_name] = value;
        } catch (err) {
            this.response.context = {};
            this.response.context[context_name] = value;
        }
    }

    setRequest(request) {
        this.request = request || {}
    }

    setResponse(response) {
        this.response = response || {};
    }

    deleteContext(context) {
        delete this.response.context[context];
    }

    printResponse() {
        logger.debug("Beginning of response");
        logger.info(this.response);
        logger.debug("End of response");
    }
}