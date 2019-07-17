const sql = require('mssql');


const dbConfig = {
    user: 'ABQ_APP_USER',
    password: 'Bvr415iD',
    server: 'WPOH0014ESQLB16.cardinalhealth.net',
    port: 53015,
    database: 'ContractsAndPricing'
};


async function executeQuery(sqlQueryString) {
    let dbResultSet;
    let pool;

    try{
        pool = await sql.connect(dbConfig);

        let result = await pool.request().query(sqlQueryString);

        dbResultSet = result['recordsets'];

    }
    catch(err){
        logger.debug("Error in executeQuery():" + err);
        dbResultSet = '';
    }
    finally{
        await sql.close();
        return dbResultSet;
    }
}

module.exports.executeQuery = executeQuery;