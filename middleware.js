const _ = require('lodash');
const { parse, isDate } = require('date-fns');

module.exports.validateDate = (dateString) => {
    const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());

    if (isDate(parsedDate)) {
        return parsedDate;
    } else {
        return null;
    }
}

module.exports.validateBody = (req, res, next) => {
    const { apelido, nome, nascimento, stack } = req.body;

    if(typeof apelido !== 'string' || apelido.length > 32) {
        return res.status(422).end();
    }

    if(typeof nome !== 'string' || nome.length > 100) {
        return res.status(422).end();
    }

    if(typeof nascimento !== 'string' || !validateDate(nascimento)) {
        return res.status(422).end();
    }

    if(!_.isUndefined(stack) && !Array.isArray(stack)) {
        req.body.stack = [];
    }

    if(stack && stack.length) {
        req.body.stack = stack.filter((s) => !_.isString(s) || s === "" || s.length > 32)
    }

    return next();
}

module.exports.errorHandler = function clientErrorHandler (err, req, res, next) {
    //logger.error(`Something failed`, err);
    //logger.error(err);``
    res
        .status(err.status || 500)
        .send({ error: err.err || 'Something failed' })
}
