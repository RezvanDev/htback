const express = require('express');
const telegramBot = require('../services/telegramBot');

const router = express.Router();

router.post('/', telegramBot.handleWebhook);

module.exports = router;