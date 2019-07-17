const dbConfig = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: 53015,
    database: 'ContractsAndPricing'
};

module.exports = dbConfig; 