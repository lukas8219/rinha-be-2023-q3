const pg = require('pg');
const { logger } = require('./logger');

const pool = new pg.Pool({ password: '12345678', user: 'postgres' });
const connection = pool.connect().then((connection) => {
    logger.info(`Connect to db`)
    return connection;
});

module.exports.db = async function createConnection(){
    return new Promise(async (res) => {
        return connection.then(res);
    })
};

module.exports.insertPerson = async function({ apelido, nome, nascimento, stack }){
    const con = await connection;
    const stackRaw = (stack || []);
    const stackValue = stackRaw.length ? `ARRAY[${stackRaw.filter(Boolean).map((s) => `'${stack}'`)}]` : null;
    const query = `
    INSERT INTO
     pessoas(
        apelido,
        nome,
        nascimento,
        stack
     )
    VALUES (
        '${apelido}',
        '${nome}',
        '${nascimento}',
        ${stackValue}
    )
    `
    return con.query(query);
}

module.exports.findById = async function(id){
    const con = await connection;
    const query = `
    SELECT
        *
    FROM
        pessoas
    WHERE "id" = ${id}
    `
    logger.error(query);
    return con.query(query);
}

module.exports.count = async function(){
    return connection.then((con) => {
        return con.query(`SELECT COUNT(id) FROM pessoas`);
    })
}

connection.then((connection) => {
    return connection.query(`
    CREATE TABLE IF NOT EXISTS pessoas (
        id SERIAL PRIMARY KEY,
        apelido VARCHAR(32) UNIQUE NOT NULL,
        nome VARCHAR(100) NOT NULL,
        nascimento DATE NOT NULL,
        stack VARCHAR(32)[]
    );
    `)
})