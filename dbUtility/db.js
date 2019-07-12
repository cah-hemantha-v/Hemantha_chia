const sql = require('mssql');


const dbConfig = {
    user: 'ABQ_APP_USER',
    password: 'Bvr415iD',
    server: 'WPOH0014ESQLB16.cardinalhealth.net',
    port: 53015,
    database: 'ContractsAndPricing'
};


async function executeQuery(sqlQueryString) {
    try{
        let pool = await sql.connect(dbConfig);

        let result = await pool.request().query(sqlQueryString);

        return result['recordset'];

    }
    catch(err){
        logger.debug("Error in executeQuery():" + err);
        return '';
    }
}

module.exports.executeQuery = executeQuery;