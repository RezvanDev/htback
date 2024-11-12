const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievementsController');
const telegramAuth = require('../middleware/telegramAuth');

// Применяем middleware для проверки аутентификации Telegram
router.use(telegramAuth);

// Роуты достижений
router.get('/', achievementsController.getUserAchievements);
router.get('/leaderboard', achievementsController.getLeaderboard);

module.exports = router;