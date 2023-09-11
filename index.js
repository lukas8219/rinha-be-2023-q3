const express = require('express');
const { Router } = require('express');
const { logger } = require('./logger');
const { insertPerson, count, findById, findByTerm } = require('./database');
const { validationFilter, errorHandler } = require('./middleware');
const bodyParser = require('body-parser');
const cluster = require('cluster');
const process = require('process');
const { v4: uuidv4 } = require('uuid');

const TIMEOUT = Number(process.env.REQ_TIMEOUT) || 5000;
const PORT = Number(process.env.HTTP_PORT) || 8080;
// process.env.UV_THREADPOOL_SIZE = 1; // os.cpus().length

const app = express();
const apiRouter = Router();

app.use(bodyParser.json())
app.use('/pessoas', apiRouter)

apiRouter.post('/', validationFilter, (req, res, _) => {
    const id = uuidv4();
    insertPerson(id, req.body).then(() => {
        res.status(201).location(`/pessoas/${id}`).end();
    }).catch(() => {
        res.status(422).end()
    })
});

apiRouter.get('/:id', (req, res, _) => {
    findById(req.params.id).then((queryResult) => {
        const [result] = queryResult.rows;
        if (!result) {
            return res.status(404).end();
        }
        res.json(result).end();
    }).catch(() => {
        res.status(404).end();
    })
});

apiRouter.get('/', (req, res, _) => {
    if (!req.query['t']) {
        return res.status(400).end();
    };

    findByTerm(req.query.t).then((queryResults) => {
        res.json(queryResults.rows).end()
    }).catch(() => {
        res.status(404).end();
    })
});

app.get('/contagem-pessoas', (_, res) => {
    count().then((queryResult) => {
        const [countResult] = queryResult.rows;
        res.json(countResult).end();
    }).catch(() => {
        res.status(422).end();
    })
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
    const serverApp = app.listen(PORT, () => {
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
