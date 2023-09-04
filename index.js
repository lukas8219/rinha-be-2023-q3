const express = require('express');
const { logger } = require('./logger');
const { insertPerson, count, findById, findByTerm } = require('./database');
const { validateBody, errorHandler } = require('./middleware');
const bodyParser = require('body-parser');
const cluster = require('cluster');
const process = require('process');
const { v4: uuidv4 } = require('uuid');

const TIMEOUT = Number(process.env.REQ_TIMEOUT) || 5000;
// process.env.UV_THREADPOOL_SIZE = 10; // os.cpus().length

const app = express();

app.use(bodyParser.json())

app.post('/pessoas', validateBody, async (req, res, _) => {
    try {
        const id = uuidv4();
        await insertPerson(id, req.body);
        return res.status(201).location(`/pessoas/${id}`).end();
    } catch (err) {
        return res.status(422).end();
    }
});

app.get('/pessoas/:id', async (req, res, _) => {
    try {
        const queryResult = await findById(req.params.id);
        const [result] = queryResult.rows;
        if (!result) {
            return res.status(404).end();
        }
        return res.json(result).end();
    } catch (err) {
        return res.status(404).end();
    }
});

app.get('/pessoas', async (req, res, _) => {
    try {
        if (!req.query['t']) {
            return res.status(400).end();
        };

        const queryResults = await findByTerm(req.query.t)

        return res.json(queryResults.rows).end();
    } catch (err) {
        return res.status(404).end();
    }
});

app.get('/contagem-pessoas', async (_, res) => {
    const queryResult = await count();
    const [countResult] = queryResult.rows;
    return res.json(countResult).end();
});

app.use(errorHandler);

const numForks = Number(process.env.CLUSTER_WORKERS) || 1;

if(cluster.isPrimary && process.env.CLUSTER === 'true'){
    logger.info(`index.js: Primary ${process.pid} is running`);

    for (let i = 0; i < numForks; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.info(`index.js: worker ${worker.process.pid} died: code ${code} signal ${signal}`);
    });
} else {
    const serverApp = app.listen(8080, () => {
        logger.info(`index.js:${process.pid}:Listening on 8080`);
    });

    if (process.env.USE_TIMEOUT === 'true') {
        serverApp.setTimeout(TIMEOUT)
        logger.info(`Starting with timeout as ${TIMEOUT}ms`)

        serverApp.on('timeout', (socket) => {
            logger.warn(`Timing out connection`);
            socket.end();
        })
    }
}
