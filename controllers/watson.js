const AssistantV1 = require('ibm-watson/assistant/v1');

class Watson {
    constructor() {
    }

    watsonPostMessage(body) {
        // Instantiate the Watson Assistant Service
        const assistant = new AssistantV1({
            version: '2018-02-16',
            iam_apikey: 'ez8kLq0zcCsq_l8CZ5EKK9YoS3rljftGM6RVz2OTSTtr',
            url: 'https://gateway.watsonplatform.net/assistant/api'
        });

        let payload = {
            workspace_id: process.env.WORKSPACE_ID || 'c6d87b7f-c012-4a4d-91bc-e7985605fc29',
            context: body.context || {},
            input: body.input || {}
        };

        /** Calls the assistant message api. Returns a promise **/
        const message = function (payload) {
            return new Promise((resolve, reject) =>
                assistant.message(payload, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                })
            );
        };

        return new Promise((resolve, reject) => {
            message(payload).then(response1 => {
                resolve(response1);
            }).catch(err => {
                reject(err);
            });
        })
    }
}

module.exports = Watson;