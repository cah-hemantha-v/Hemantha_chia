const GlideRecord = require('./gliderecord');
const logger =require('../utils/logger');

module.exports = class SnowLogger {
    constructor() {
        this.chiaID = process.env.SNOW_CHIA_UID;
        this.snowInstance = process.env.SNOW_INSTANCE_URL;
    }

    conversationExists(conversation_id) {
        return new Promise((resolve, reject) => {
            const conversation_table = new GlideRecord('u_chia_conversations', 'v1');
            conversation_table.addEncodedQuery(`u_conversation_id=${conversation_id}`);
            conversation_table.query().then((result) => {
                resolve(result.length > 0);
            }).catch((err) => {
                resolve(false);
            });
        });
    }

    createConversation(chia_obj) {
        return new Promise((resolve, reject) => {
            const conversation_table = new GlideRecord('u_chia_conversations', 'v1');
            let caller_id = this.chiaID;
            try {
                caller_id = chia_obj.context.sn.user.sys_id || chia_obj.context.sn.bot.sys_id
            } catch (err) {
                logger.error(err);
            }

            const conversation_obj = {
                u_user: caller_id,
                u_source: "Med Pricing",
                sys_updated_by: "chia.bot",
                u_conversation_id: chia_obj.context.conversation_id
            }

            conversation_table.insert(conversation_obj).then((response) => {
                resolve(response);
            }).catch((err) => {
                logger.error(err);
                reject(`Error occured during ticket creation, please try again`);
            });
        });
    }

    appendConversationLog(chia_obj) {
        return new Promise((resolve, reject) => {
            let snLog = new GlideRecord('u_chia_conversation_logs', 'v1');
            let caller_id = this.chiaId;
            try {
                caller_id = chia_obj.context.sn.user.sys_id
            } catch (err) {
                logger.error(err);
            }
            const log_obj = {
                u_user: caller_id,
                u_user_input: chia_obj.input.text || "",
                u_conversation_id: chia_obj.context.conversation_id,
                u_conversation: chia_obj.context.conversation_id,
                u_chia_output: chia_obj.output.text,
                u_intent: (chia_obj.intents[0]) ? chia_obj.intents[0].intent : undefined,
                u_intent_confidence: (chia_obj.intents[0]) ? chia_obj.intents[0].confidence : undefined,
                u_chia_response: chia_obj.output
            };
            snLog.insert(log_obj).then((response) => {
                logger.debug(`log entry complete with conversation ID - ${response.u_conversation_id}`);
                resolve(response);
            }, (err) => {
                logger.error(`Error in creating log entry`);
                reject(err);
            });
        });
    }

    createConversationLog(chia_obj) {
        const conversation_id = chia_obj.context.conversation_id;
        this.conversationExists(conversation_id).then((exists) => {
            logger.debug(exists);
            if (!exists) {
                this.createConversation(chia_obj).then(() => {
                    this.appendConversationLog(chia_obj);
                }).catch((err) => {
                    logger.error(err);
                });
            } else {
                this.appendConversationLog(chia_obj)
            }
        })
    }
}