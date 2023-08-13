const { logger } = require("./logger");
const _ = require('lodash');
const { promisify } = require('util');

module.exports.validateBody = async function validate(req, res, next){
    const { apelido, nome, nascimento, stack } = req.body;
    if(!apelido || typeof apelido !== 'string'){
        res.status(422);
        return res.json({
            error: 'apelido invalido'
        })
    };

    if(apelido.length > 32) {
        res.status(422);
        return res.json({
            error: 'apelido invalido'
        })
    }

    if(!nome || typeof nome !== 'string') {
        res.status(422);
        return res.json({
            error: 'nome invalido'
        })
    }

    if(nome.length > 100) {
        res.status(422);
        return res.json({
            error: 'nome invalido'
        })
    }

    if(!nascimento || typeof nascimento !== 'string'){
        res.status(422);
        return res.json({
            error: 'nascimento invalido'
        })
    }

    if(nascimento.length !== "AAAA-MM-DD".length) {
        res.status(422);
        return res.json({
            error: 'nascimento invalido'
        })
    }

    if(!_.isUndefined(stack) && !Array.isArray(stack)){
        res.status(422);
        return res.json({
            error: 'stack precisa ser uma array'
        })
    }

    if(stack && stack.length && stack.some((s) => s === undefined || s === null || s === "" || !_.isString(s))){
        res.status(422);
        return res.json({
            error: 'stack com item invalido'
        })
    }

    return await next();
}

module.exports.errorHandler = function clientErrorHandler (err, req, res, next) {
    logger.error(`Something failed`, err);
    logger.error(err);``
    res
        .status(err.status || 500)
        .send({ error: err.err || 'Something failed' })
}