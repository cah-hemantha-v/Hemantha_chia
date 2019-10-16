const dbConfig = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: 'ContractsAndPricing',
    requestTimeout: 30000
};

module.exports = dbConfig; 