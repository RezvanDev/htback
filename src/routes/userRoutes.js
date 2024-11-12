const express = require('express');
const telegramAuth = require('../middleware/telegramAuth');
const userController = require('../controllers/userController');

const router = express.Router();

router.use(telegramAuth);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

module.exports = router;