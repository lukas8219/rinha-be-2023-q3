const pg = require('pg');
const { logger } = require('./logger');
const { callbackify, promisify } = require('util');

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
            stack VARCHAR(32)[]
        );
    
        CREATE INDEX IF NOT EXISTS term_search_index_apelido ON pessoas
            USING gin(to_tsvector('english', apelido));
          
        CREATE INDEX IF NOT EXISTS term_search_index_nome ON pessoas
            USING gin(to_tsvector('english', nome));
        `)
});

async function connect() {
    try {
        await pool.connect();
    } catch(err){
        setTimeout(() => {
            connect();
            logger.error(`database.js: an error occured when connecting ${err} retrying connection on 3 secs`);
        }, 3000)
    }
}

connect();

module.exports.db = async function createConnection() {
    return new Promise(async (res) => {
        return connection.catch(connectionErrorHandler).then(res);
    })
};

module.exports.insertPerson = async function ({ apelido, nome, nascimento, stack }) {
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
    return pool.query(query);
}

module.exports.findById = async function (id) {
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
	    to_tsvector('english', apelido) @@ to_tsquery('${term}:*')
	    OR to_tsvector('english', nome) @@ to_tsquery('${term}:*')
	    OR to_tsvector(array_to_string(stack, ' ')) @@ to_tsquery('${term}:*')
    LIMIT 50;`
    return pool.query(query);
}

module.exports.count = async function () {
    return pool.query(`SELECT COUNT(id) FROM pessoas`);
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
                setImmediate(() => {
                    (queue || []).forEach((cb) => cb(...arguments))
                    batchItems[moduleKey].delete(key);
                });
            };
            if (queue) {
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