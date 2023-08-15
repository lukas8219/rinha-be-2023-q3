const express = require('express');
const { logger } = require('./logger');
const { insertPerson, count, findById, findByTerm } = require('./database');
const { validateBody, errorHandler } = require('./middleware');
const bodyParser = require('body-parser');

const os = require('os');
const cluster = require('cluster');
const process = require('process');

const TIMEOUT = Number(process.env.REQ_TIMEOUT) || 5000;
process.env.UV_THREADPOOL_SIZE = os.cpus().length

const app = express();

app.use(bodyParser.json())


app.post('/pessoas', validateBody, async (req, res, next) => {
    try {
        await insertPerson(req.body);
        return res.status(201).json(req.body);
    } catch(err) {
        return next({ status: 422, err });
    }
});

app.get('/pessoas/:id',async (req, res, next) => {
    try {
        const queryResult = await findById(req.params.id);
        const [ result ] = queryResult.rows;
        if(!result){
            return next({ status: 404, err: 'não encontrado' });
        }
        return res.json(result);
    } catch(err) {
        return next(err);
    }
});

app.get('/pessoas', async (req, res, next) => { 
    try {
        if(!req.query['t']){
            return res.status(400).end();
        };
        const queryResults = await findByTerm(req.query.t)
        return res.json(queryResults.rows);
    } catch (err) {
        return next(err);
    }
});

app.get('/contagem-pessoas', async (req, res) => {
    const queryResult = await count();
    const [ countResult ] = queryResult.rows;
    return res.json(countResult).end();
});

app.use(errorHandler);

const numCPUs = Math.ceil(os.cpus().length / 2);

if(cluster.isPrimary && process.env.CLUSTER === 'true'){
    logger.info(`index.js: Primary ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
  
    cluster.on('exit', (worker, code, signal) => {
        logger.info(`index.js: worker ${worker.process.pid} died: code ${code} signal ${signal}`);
    });
} else {
    const serverApp = app.listen(8080, () => {
        logger.info(`index.js:${process.pid}:Listening on 8080`);
    });


    if(process.env.USE_TIMEOUT === 'true'){
        serverApp.setTimeout(TIMEOUT)
        logger.info(`Starting with timeout as ${TIMEOUT}ms`)
    
        serverApp.on('timeout', (socket) => {
            logger.warn(`Timing out connection`);
            socket.end();
        })
    }
}