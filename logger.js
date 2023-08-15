const pino = require('pino');

module.exports.logger = pino({
    disabled: !!process.env.NOLOG,
    minLength: 4096, // Buffer before writing
    sync: false, // Asynchronous logging,
    level: process.env.PINO_LOG_LEVEL || 'debug',
});