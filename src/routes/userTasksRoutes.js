const express = require('express');
const router = express.Router();
const userTasksController = require('../controllers/userTasksController');
const telegramAuth = require('../middleware/telegramAuth');

// Применяем middleware для проверки аутентификации Telegram
router.use(telegramAuth);

// Маршруты для пользовательских задач
router.get('/', userTasksController.getTasks.bind(userTasksController));
router.post('/', userTasksController.createTask.bind(userTasksController));
router.post('/:taskId/complete', userTasksController.completeTask.bind(userTasksController));
router.delete('/:taskId', userTasksController.deleteTask.bind(userTasksController));

module.exports = router;