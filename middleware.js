const _ = require('lodash');
const moment = require('moment');

module.exports.validateBody = async function validate(req, res, next){
    const { apelido, nome, nascimento, stack } = req.body;
    if(!apelido || typeof apelido !== 'string'){
        return res.status(422);
    };

    if(apelido.length > 32) {
        return res.status(422);
    }

    if(!nome || typeof nome !== 'string') {
        return res.status(422);
    }

    if(nome.length > 100) {
        return res.status(422);
    }

    if(!nascimento || typeof nascimento !== 'string'){
        return res.status(422);
    }

    if(nascimento.length !== "AAAA-MM-DD".length) {
        return res.status(422);
    }

    if(nascimento.length && !moment(nascimento, 'YYYY-MM-DD').isValid()){
        return res.status(422);
    }

    if(!_.isUndefined(stack) && !Array.isArray(stack)){
        return res.status(422);
    }

    if(stack&& stack.length && stack.some((s) => s === undefined || s === null || s === "" || !_.isString(s))){
        return res.status(422);
    }

    if(stack && stack.length && stack.some((s) => s.length > 32)){
        return res.status(422);
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
