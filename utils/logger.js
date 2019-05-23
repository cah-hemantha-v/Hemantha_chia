let winston = require('winston');

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),

        winston.format.printf(info => {
            info.message = JSON.stringify(info.message, null, 2);
            return `${info.level}: ${info.message} - ${info.timestamp}`
        })
    ),
    transports: [
        new winston.transports.Console({
            level: 'debug',
            json: true,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),

                winston.format.printf(info => {
                    info.message = info.message;
                    return `${info.level}: ${info.message} - ${info.timestamp}`
                }),
            )
        })
    ]
});

module.exports = logger;