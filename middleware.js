const _ = require('lodash');
const { parse, isDate } = require('date-fns');

module.exports.validateDate = (dateString) => {
    // isDate returns true regardless if the date is actually valid or not
    return !isNaN(parse(dateString, 'yyyy-MM-dd', new Date()))
}

module.exports.validateBody = (req) => {
    const { apelido, nome, nascimento, stack } = req.body

    if(typeof apelido !== 'string' || apelido.length > 32)
        return false

    if(typeof nome !== 'string' || nome.length > 100)
        return false

    if(typeof nascimento !== 'string' || !this.validateDate(nascimento))
        return false

    if(!_.isUndefined(stack) && !Array.isArray(stack))
        req.body.stack = []

    if(stack && stack.length)
        req.body.stack = stack.filter((s) => !_.isString(s) || s === "" || s.length > 32)

    return true
}

module.exports.validationFilter = (req, res, next) => {
    if (!this.validateBody(req))
        return res.status(422).end()

    next()
}

module.exports.errorHandler = (err, req, res, _) => {
    res.status(err.status || 500).end()
}
