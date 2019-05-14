const AssistantV1 = require('ibm-watson/assistant/v1');

class Watson {
    constructor() {
        this.version = '2018-02-16';
        this.iam_apikey = 'ez8kLq0zcCsq_l8CZ5EKK9YoS3rljftGM6RVz2OTSTtr';
        this.url = 'https://gateway.watsonplatform.net/assistant/api';
        this.workspace_id = 'c6d87b7f-c012-4a4d-91bc-e7985605fc29';
    }

    watsonPostMessage(body) {
        return new Promise((resolve, reject) => {
            // Instantiate the Watson Assistant Service
            const assistant = new AssistantV1({
                version: this.version,
                iam_apikey: this.iam_apikey,
                url: this.url
            });

            let payload = {
                workspace_id: process.env.WORKSPACE_ID || this.workspace_id,
                context: body.context || {},
                input: body.input || {}
            };
            
            /** Calls the assistant message api. Returns a promise **/
            assistant.message(payload, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        })
    }
}

module.exports = Watson;