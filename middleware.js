const _ = require('lodash');
const { parse, isDate } = require('date-fns');

module.exports.validateBody = (req, res, next) => {
    const { apelido, nome, nascimento, stack } = req.body;

    if(typeof apelido !== 'string' || apelido.length > 32) {
        return res.status(422).end();
    }

    if(typeof nome !== 'string' || nome.length > 100) {
        return res.status(422).end();
    }

    if(typeof nascimento !== 'string' || !isDate(parse(nascimento, 'yyyy-MM-dd', new Date()))) {
        return res.status(422).end();
    }

    if(!_.isUndefined(stack) && !Array.isArray(stack)) {
        req.body.stack = [];
    }

    if(stack && stack.length) {
        req.body.stack = stack.filter((s) => !_.isString(s) || s === "" || s.length > 32)
    }

    next();
}

module.exports.errorHandler = (err, req, res, _) => {
    res.status(err.status || 500).end()
}
