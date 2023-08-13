const pg = require('pg');
const { logger } = require('./logger');
const { callbackify, promisify } = require('util');

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
    return con.query(query);
}

module.exports.findByTerm = async function findByTerm(term){
    const con = await connection;
    const query = `
    SELECT
        *
    FROM
        pessoas
    WHERE
	    to_tsvector('english', apelido) @@ to_tsquery('${term}:*')
	    OR to_tsvector('english', nome) @@ to_tsquery('${term}:*')
	    OR to_tsvector(array_to_string(stack, ' ')) @@ to_tsquery('${term}:*')
    LIMIT 50;`
    return con.query(query);
}

module.exports.count = async function(){
    return connection.then((con) => {
        return con.query(`SELECT COUNT(id) FROM pessoas`);
    })
}

const batchItems = {};

const toBeBatched = ['findById', 'findByTerm'];

process.env.BATCH === 'true' ? (() => {
toBeBatched.forEach((moduleKey) => {
    batchItems[moduleKey] = new Map();
    const fn = module.exports[moduleKey];

    function newApi(){
        const args = new Array(...arguments).slice(0, arguments.length - 1);
        const key = JSON.stringify(args);
        const queue = batchItems[moduleKey].get(key);
        const realCb = arguments[arguments.length - 1];
        const cb = function(){
            realCb(...arguments);
            setImmediate(() => {
                (queue || []).forEach((cb) => cb(...arguments))
                batchItems[moduleKey].delete(key);
            });
        };
        if(queue){
            logger.info(`${moduleKey} has been queued: for args ${key}`);
            return queue.push(cb);
        }
        batchItems[moduleKey].set(key, new Array([cb]));
        arguments[arguments.length - 1] = cb;
        callbackify(fn).call(this, ...arguments);
    }

    module.exports[moduleKey] = promisify(newApi);
})
})() : null;



connection.then((connection) => {
    return connection.query(`
    CREATE TABLE IF NOT EXISTS pessoas (
        id SERIAL PRIMARY KEY,
        apelido VARCHAR(32) UNIQUE NOT NULL,
        nome VARCHAR(100) NOT NULL,
        nascimento DATE NOT NULL,
        stack VARCHAR(32)[]
    );

    CREATE INDEX IF NOT EXISTS term_search_index_apelido ON pessoas
        USING gin(to_tsvector('english', apelido));
      
    CREATE INDEX IF NOT EXISTS term_search_index_nome ON pessoas
        USING gin(to_tsvector('english', nome));
    `)
})