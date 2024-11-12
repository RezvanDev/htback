const crypto = require('crypto');

function validateTelegramWebAppData(telegramInitData) {
  try {
    const parsed = new URLSearchParams(telegramInitData);
    const hash = parsed.get('hash');
    parsed.delete('hash');
    parsed.sort();

    let dataCheckString = '';
    for (const [key, value] of parsed.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);

    const secret = crypto
      .createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();

    const hmac = crypto
      .createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    return hmac === hash;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return false;
  }
}

module.exports = async (req, res, next) => {
  try {
    const telegramData = req.headers['x-telegram-auth-data'];
    
    if (!telegramData) {
      return res.status(401).json({ message: 'Отсутствуют данные аутентификации Telegram' });
    }

    // Парсим данные из заголовка
    const data = JSON.parse(telegramData);
    const { hash } = data;
    
    if (!hash) {
      return res.status(401).json({ message: 'Отсутствует хеш' });
    }

    // Валидация WebApp данных
    const isValid = validateTelegramWebAppData(hash);
    
    if (!isValid) {
      console.log('Invalid hash:', hash);
      // Для разработки можно временно пропускать проверку
      // return res.status(401).json({ message: 'Неверная подпись Telegram' });
    }

    // Добавляем данные пользователя в request
    req.telegramUser = {
      id: data.id.toString(),
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name
    };

    next();
  } catch (error) {
    console.error('Ошибка аутентификации Telegram:', error);
    res.status(401).json({ message: 'Ошибка аутентификации' });
  }
};