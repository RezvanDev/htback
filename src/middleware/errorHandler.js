const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ message: 'Произошла внутренняя ошибка сервера' });
};