const fs = require('fs');
const AssistantV1 = require('ibm-watson/assistant/v1');

    const service = new AssistantV1({
        version: '2018-02-16',
        iam_apikey: process.env.WATSON_APIKEY, 
        url: process.env.WATSON_URL 
    });

    let watson_assistant = {};
    fs.readFile(process.env.WORKSPACE_FILE_PATH, 'utf8', (err, data) => {
        if (err) throw err;
        watson_assistant = JSON.parse(data);
        const params = {
            workspace_id: process.env.WORKSPACE_ID,
            name: watson_assistant['name'] || null,
            language: watson_assistant['language'] || null,
            description: watson_assistant['description'] || null,
            intents: watson_assistant['intents'] || null,
            entities: watson_assistant['entities'] || null,
            dialog_nodes: watson_assistant['dialog_nodes'] || null,
            counterexamples: watson_assistant['counterexamples'] || null,
            metadata: watson_assistant['metadata'] || null,
            learning_opt_out: watson_assistant['learning_opt_out'] || null,
            append: false
        };
        service.updateWorkspace(params).then(res => {
            console.log(JSON.stringify(res, null, 2));
            console.log(`Your watson-assistant pushed successfully`);
        }).catch(err => {
            console.log(err);
        });
    })