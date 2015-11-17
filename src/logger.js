/**********************************************************************************************************************/
/** Logging ***********************************************************************************************************/
/**********************************************************************************************************************/
/**
 * ötletek, esetleg a Loggly service bevezetése.
 */

/*
 Logging levels
 { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
 */

/*logger.error('Hello distributed log files! Error');
 logger.info('Hello distributed log files! Info');
 logger.warn('Hello distributed log files! Warn');
 logger.debug('Hello distributed log files! Debug');
 logger.silly('Hello distributed log files! silly');*/


var logger = require('winston');

logger.remove(logger.transports.Console);

if (!process.env.hasOwnProperty('LOGGER_DEBUG_FILE') || process.env['LOGGER_DEBUG_FILE'] === true) {
    logger.add(logger.transports.File, {
        name: 'debug-file',
        filename: __dirname + '/debug.log',
        level: 'info',
        json: false
    });
}

if (!process.env.hasOwnProperty('LOGGER_ERROR_FILE') || process.env['LOGGER_ERROR_FILE'] === true) {
    logger.add(logger.transports.File, {
        name: 'error-file',
        filename: __dirname + '/error.log',
        level: 'error',
        json: false
    });
}

if (!process.env.hasOwnProperty('LOGGER_CONSOLE') || process.env['LOGGER_CONSOLE'] === true) {
    logger.add(logger.transports.Console, {
        level: 'debug'
    });
}

module.exports = logger;