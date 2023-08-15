const _ = require('lodash');
const { logger } = require('./logger');
const moment = require('moment');
const { store } = require('./cache');
const { existsByApelido } = require('./database');

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

    if(nascimento.length && !moment(nascimento, 'YYYY-MM-DD').isValid()){
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

    if(stack&& stack.length && stack.some((s) => s === undefined || s === null || s === "" || !_.isString(s))){
        res.status(422);
        return res.json({
            error: 'stack com item invalido'
        })
    }

    if(stack && stack.length && stack.some((s) => s.length > 32)){
        res.status(422);
        return res.json({
            error: 'stack com item maior que 32 caracteres'
        })
    }

    const isUsed = await store.sIsMember('pessoas:used-nicknames', apelido);

    if(isUsed){
        res.status(422);
        return res.json({
            error: 'nome ou apelido em uso',
        })
    }

    const { count } = await existsByApelido(apelido);

    if(Number(count)){
        await store.sAdd('pessoas:used-nicknames', apelido);
        return res.status(422).json({
            error: 'apelido em uso'
        })
    }

    return await next();
}

module.exports.errorHandler = function clientErrorHandler (err, req, res, next) {
    //logger.error(`Something failed`, err);
    //logger.error(err);``
    res
        .status(err.status || 500)
        .send({ error: err.err || 'Something failed' })
}