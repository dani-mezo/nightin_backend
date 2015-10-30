/**********************************************************************************************************************/
/** Logging ***********************************************************************************************************/
/**********************************************************************************************************************/
/**
 * Ötletek, esetleg a Loggly service bevezetése.
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

module.exports = function () {
    var winston = require('winston');

    var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.File)({
                name: 'debug-file',
                filename: __dirname + '/debug.log',
                level: 'info',
                json: false
            }),
            new (winston.transports.File)({
                name: 'error-file',
                filename: __dirname + '/error.log',
                level: 'error',
                json: false
            }),
            new (winston.transports.Console)({
                level: 'debug'
            })
        ]
    });

    return logger;
};