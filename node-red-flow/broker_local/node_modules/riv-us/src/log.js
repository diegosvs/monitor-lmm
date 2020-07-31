import winston from 'winston';

const disableLog = process.env.NODE_ENV === 'test' && !process.env.RIVUS_LOG_LEVEL;
const logLevel = process.env.RIVUS_LOG_LEVEL || 'info';
const prettyLog = !process.env.RIVUS_LOG_SIMPLE;

const logParams = {
  console: {
    level: logLevel,
    colorize: prettyLog,
    timestamp: true,
    prettyPrint: prettyLog,
    humanReadableUnhandledException: true
  }
};


const log = winston.loggers.add('rivus', logParams);
if (disableLog) {
  winston.loggers.get('rivus').remove(winston.transports.Console)
}

export default log;
