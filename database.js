const pg = require('pg');
const { logger } = require('./logger');
const { callbackify, promisify } = require('util');
const res = require('express/lib/response');

const URL = process.env.DB_URL || 'postgres://postgres:12345678@localhost:5432/postgres';

const pool = new pg.Pool({ connectionString: URL, min: 8, max: 8 });

pool.on('error', connect);

pool.once('connect', () => {
    logger.info(`database.js: Connected  to db ${URL}`)
    logger.info(`Creating table "pessoas" if not exists`);
    return pool.query(`
        CREATE TABLE IF NOT EXISTS pessoas (
            id SERIAL PRIMARY KEY,
            apelido VARCHAR(32) UNIQUE NOT NULL,
            nome VARCHAR(100) NOT NULL,
            nascimento DATE NOT NULL,
            stack JSON
        );
    
        CREATE INDEX IF NOT EXISTS term_search_index_apelido ON pessoas
            USING gin(to_tsvector('english', apelido));
          
        CREATE INDEX IF NOT EXISTS term_search_index_nome ON pessoas
            USING gin(to_tsvector('english', nome));

        CREATE INDEX IF NOT EXISTS term_search_index_stack ON pessoas
            USING gin(to_tsvector('english', stack));
        `)
});

async function connect() {
    try {
        logger.info(`Connecting to db ${URL}`);
        await pool.connect();
    } catch(err){
        setTimeout(() => {
            connect();
            logger.error(`database.js: an error occured when connecting ${err} retrying connection on 3 secs`);
        }, 3000)
    }
}

connect();

module.exports.insertPerson = async function ({ apelido, nome, nascimento, stack }) {
    const query = `
    INSERT INTO
     pessoas(
        apelido,
        nome,
        nascimento,
        stack
     )
    VALUES (
        $1,
        $2,
        $3,
        $4::json
    )
    RETURNING
        id,
        apelido,
        nome,
        nascimento,
        stack
    `
    return pool.query(query, [apelido, nome, nascimento, JSON.stringify(stack)]);
}

module.exports.findById = async function findById(id) {
    const query = `
    SELECT
        id,
        apelido,
        nome,
        to_char(nascimento, 'YYYY-MM-DD') as nascimento,
        stack
    FROM
        pessoas
    WHERE "id" = ${id}
    `
    return pool.query(query);
}

module.exports.findByTerm = async function findByTerm(term) {
    const query = `
    SELECT
        id,
        apelido,
        nome,
        to_char(nascimento, 'YYYY-MM-DD') as nascimento,
        stack
    FROM
        pessoas
    WHERE
	    to_tsvector('english', apelido) @@ plainto_tsquery('"${term}":*')
	    OR to_tsvector('english', nome) @@ plainto_tsquery('"${term}":*')
	    OR to_tsvector('english', stack) @@ plainto_tsquery('"${term}":*')
    LIMIT 50;`
    return pool.query(query);
}

module.exports.existsByApelido = async function existsByApelido(apelido){
    const querySet = await pool.query(`SELECT COUNT(1) FROM pessoas WHERE "apelido" = $1`, [apelido])
    const [ result ] = querySet.rows;
    return result;
}

module.exports.count = async function count() {
    return pool.query(`SELECT COUNT(1) FROM pessoas`);
}

const batchItems = {};

const toBeBatched = ['findById', 'findByTerm'];

process.env.BATCH === 'true' ? (() => {
    toBeBatched.forEach((moduleKey) => {
        batchItems[moduleKey] = new Map();
        const fn = module.exports[moduleKey];

        function newApi() {
            const args = new Array(...arguments).slice(0, arguments.length - 1);
            const key = JSON.stringify(args);
            const queue = batchItems[moduleKey].get(key);
            const realCb = arguments[arguments.length - 1];
            const cb = function () {
                realCb(...arguments);
                (queue || []).forEach((cb) => cb(...arguments))
                batchItems[moduleKey].delete(key);
            };
            if (queue) {
                logger.debug(`${moduleKey} has been queued: for args ${key}`);
                return queue.push(cb);
            }
            batchItems[moduleKey].set(key, new Array([cb]));
            arguments[arguments.length - 1] = cb;
            callbackify(fn).call(this, ...arguments);
        }

        module.exports[moduleKey] = promisify(newApi);
    })
})() : null;

const LOG_TRESHOLD = Number(process.env.LOG_TRESHOLD) || 3000;

process.env.SLOW_QUERY_ALERT === 'true' ? (() => {
    Object.keys(module.exports).forEach((mK) => {
        const fn = module.exports[mK];

        async function newApi(){
            const timestamp = Date.now();
            const result = await fn(...arguments);
            const final = Date.now();
            const delta = final - timestamp;
            if(delta >= LOG_TRESHOLD){
                logger.warn(`Query took ${delta}ms for fn ${fn.name}`);
            }
            return result;
        }

        module.exports[mK] = newApi.bind(module.exports);
    })
})() : null