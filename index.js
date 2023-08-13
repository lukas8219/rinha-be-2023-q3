const express = require('express');
const { logger } = require('./logger');
const { insertPerson, count, findById } = require('./database');
const { validateBody, errorHandler } = require('./middleware');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json())

/*
{
    "apelido" : "josé",
    "nome" : "José Roberto",
    "nascimento" : "2000-10-01",
    "stack" : ["C#", "Node", "Oracle"]
}
*/

app.post('/pessoas', validateBody, async (req, res, next) => {
    try {
        await insertPerson(req.body);
        return res.json(req.body);
    } catch(err) {
        return next({ status: 422, err });
    }
});

app.get('/pessoas/:id', async (req, res, next) => {
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

app.get('/pessoas', (req, res, next) => { 
    try {
        if(!req.query['t']){
            return res.status(400).end();
        };
        return res.json({});
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

app.listen(8080, () => {
    logger.info(`Listening on 8080`);
});