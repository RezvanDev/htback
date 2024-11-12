const TelegramBot = require('node-telegram-bot-api');
const prisma = require('../config/database');
const crypto = require('crypto');

// Создаем экземпляр бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  webhook: true,
  polling: false,
  cancellation: true
});

class TelegramBotService {
  /**
   * Запуск бота и установка вебхука
   */
  async startBot() {
    try {
      const webhookUrl = `${process.env.APP_URL}/telegram-webhook`;
      await bot.setWebHook(webhookUrl);
      console.log('Telegram webhook set to:', webhookUrl);

      // Устанавливаем команды бота
      await bot.setMyCommands([
        { command: '/start', description: 'Начать использование бота' },
        { command: '/help', description: 'Получить помощь' }
      ]);
    } catch (error) {
      console.error('Error setting webhook:', error);
      throw error;
    }
  }

  /**
   * Обработка входящих сообщений через webhook
   */
  async handleWebhook(req, res) {
    try {
      const { message } = req.body;
      console.log('Received webhook message:', message);

      if (message && message.from) {
        const { id: telegramId, username, first_name, last_name } = message.from;

        // Проверяем существует ли пользователь
        const existingUser = await prisma.user.findUnique({
          where: { telegramId: telegramId.toString() }
        });

        if (!existingUser) {
          // Создаем нового пользователя
          await prisma.user.create({
            data: {
              telegramId: telegramId.toString(),
              username: username || '',
              firstName: first_name || '',
              lastName: last_name || '',
              totalXP: 0
            }
          });

          // Отправляем приветственное сообщение новому пользователю
          await bot.sendMessage(
            telegramId,
            'Добро пожаловать! Используйте наше мини-приложение для отслеживания ваших достижений.'
          );
        } else {
          // Обновляем информацию существующего пользователя
          await prisma.user.update({
            where: { telegramId: telegramId.toString() },
            data: {
              username: username || existingUser.username,
              firstName: first_name || existingUser.firstName,
              lastName: last_name || existingUser.lastName,
              updatedAt: new Date()
            }
          });

          // Отправляем сообщение существующему пользователю
          await bot.sendMessage(
            telegramId,
            'С возвращением! Ваши достижения ждут вас в мини-приложении.'
          );
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Проверка подписи данных от Telegram
   */
  async checkTelegramSignature(hash, data) {
    try {
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!BOT_TOKEN) {
        console.error('Bot token not configured');
        return false;
      }

      // Создаем строку для проверки
      const dataCheckString = Object.keys(data)
        .sort()
        .filter(key => data[key] !== undefined)
        .map(key => `${key}=${data[key]}`)
        .join('\n');

      // Создаем secret key из токена бота
      const secretKey = crypto
        .createHash('sha256')
        .update(BOT_TOKEN)
        .digest();

      // Создаем HMAC
      const hmac = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      const isValid = hmac === hash;
      console.log('Signature check:', { isValid, receivedHash: hash, calculatedHash: hmac });
      
      return isValid;
    } catch (error) {
      console.error('Error checking Telegram signature:', error);
      return false;
    }
  }

  /**
   * Отправка уведомления пользователю
   */
  async sendNotification(telegramId, message, options = {}) {
    try {
      const defaultOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };

      await bot.sendMessage(
        telegramId,
        message,
        { ...defaultOptions, ...options }
      );
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error.message);
      return false;
    }
  }

  /**
   * Проверка существования пользователя
   */
  async getUserByTelegramId(telegramId) {
    try {
      return await prisma.user.findUnique({
        where: { telegramId: telegramId.toString() }
      });
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Обработка команды /start
   */
  async handleStartCommand(msg) {
    const chatId = msg.chat.id;
    try {
      const welcomeMessage = 
        'Добро пожаловать! 👋\n\n' +
        'Это бот для отслеживания ваших достижений и задач. ' +
        'Используйте наше мини-приложение для:\n\n' +
        '• Выполнения ежедневных задач\n' +
        '• Получения достижений\n' +
        '• Отслеживания прогресса\n\n' +
        'Нажмите кнопку "Открыть приложение" чтобы начать!';

      const keyboard = {
        inline_keyboard: [
          [{
            text: '🚀 Открыть приложение',
            web_app: { url: process.env.WEBAPP_URL }
          }]
        ]
      };

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error handling start command:', error);
      await this.sendNotification(
        chatId,
        'Произошла ошибка. Пожалуйста, попробуйте позже.'
      );
    }
  }
}

// Создаем и экспортируем экземпляр сервиса
const telegramBotService = new TelegramBotService();

// Устанавливаем обработчики команд
bot.onText(/\/start/, (msg) => telegramBotService.handleStartCommand(msg));

bot.onText(/\/help/, async (msg) => {
  await telegramBotService.sendNotification(
    msg.chat.id,
    'Чтобы начать использовать бота, просто нажмите кнопку "Открыть приложение"!'
  );
});

module.exports = telegramBotService;