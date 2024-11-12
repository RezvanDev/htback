require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const telegramWebhook = require('./routes/telegramWebhook');
const errorHandler = require('./middleware/errorHandler');
const telegramBot = require('./services/telegramBot');
const taskRoutes = require('./routes/taskRoutes');
const taskGenerator = require('./services/taskGenerator');
const authMiddleware = require('./middleware/telegramAuth');
const userTasksRoutes = require('./routes/userTasksRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const prisma = new PrismaClient();

// Детальное логирование запросов
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n=== ${timestamp} ===`);
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  if (['POST', 'PUT'].includes(req.method)) {
    console.log('Body:', req.body);
  }
  next();
});

// CORS настройка
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Telegram-Auth-Data',
    'ngrok-skip-browser-warning'
  ],
  credentials: true
}));

app.use(express.json());

// Базовый роут для проверки работоспособности
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Основные роуты
// Убрали глобальное применение authMiddleware и применяем его только где нужно
app.use('/tasks', taskRoutes); // Убрали authMiddleware для тестирования
app.use('/telegram-webhook', telegramWebhook);
app.use('/tasks/complete', authMiddleware);
app.use('/user-tasks', userTasksRoutes);
app.use('/achievements', achievementRoutes);
app.use('/profile', profileRoutes);

// Обработка ошибок
app.use(errorHandler);

// Планировщик для генерации заданий (каждый день в полночь)
cron.schedule('0 0 * * *', async () => { // Исправлен формат cron
  try {
    console.log('Starting daily task generation...');
    await taskGenerator.generateTasks();
    console.log('Daily task generation completed');
  } catch (error) {
    console.error('Error in task generation:', error);
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    console.log(`Server running on port ${PORT}`);
    await telegramBot.startBot();
    console.log('Telegram bot started successfully');
    // Генерируем начальные задания при запуске
    await taskGenerator.generateTasks();
    console.log('Initial tasks generated');
  } catch (error) {
    console.error('Startup error:', error);
  }
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});