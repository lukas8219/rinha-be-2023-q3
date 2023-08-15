const redis = require('redis');
const { logger } = require('./logger');

module.exports.store = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost'});

module.exports.store.on('error', function logError(err){
    logger.error(`cache.js: an error occurred ${err} retrying in sec`);
    setTimeout(() => {
        module.exports.store.connect();
    }, 1000)
})

module.exports.store.on('connect', function(){
    logger.info(`cache.js: cached is connected!`);
});

module.exports.store.connect();

