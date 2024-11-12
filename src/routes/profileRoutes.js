const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Получение профиля
router.get('/', async (req, res) => {
  try {
    console.log('Request headers:', req.headers);
    console.log('Auth data:', req.headers['x-telegram-auth-data']);

    const authData = req.headers['x-telegram-auth-data'];
    if (!authData) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id, first_name, last_name, username } = JSON.parse(authData);
    console.log('Looking for user with telegramId:', id);

    let user = await prisma.user.findUnique({
      where: { telegramId: id.toString() }
    });

    if (!user) {
      // Создаем пользователя если он не существует
      user = await prisma.user.create({
        data: {
          telegramId: id.toString(),
          firstName: first_name,
          lastName: last_name || '',
          username: username,
          totalXP: 0
        }
      });
      console.log('Created new user:', user);
    }

    // Рассчитываем уровень и следующий уровень XP
    const level = Math.floor(user.totalXP / 1000) + 1;
    const nextLevelXP = level * 1000;

    // Получаем статистику
    const [completedTasks, achievements] = await Promise.all([
      prisma.taskCompletion.count({
        where: { userId: user.id }
      }),
      prisma.userAchievement.count({
        where: { userId: user.id }
      })
    ]);

    res.json({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      totalXP: user.totalXP,
      level,
      nextLevelXP,
      stats: {
        tasksCompleted: completedTasks,
        achievements: {
          unlocked: achievements,
          total: await prisma.achievement.count()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получение статистики пользователя
router.get('/stats', async (req, res) => {
  try {
    const authData = req.headers['x-telegram-auth-data'];
    if (!authData) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id } = JSON.parse(authData);
    const user = await prisma.user.findUnique({
      where: { telegramId: id.toString() },
      include: {
        completedTasks: {
          include: { task: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Получаем статистику по категориям
    const categories = {};
    const validCategories = ['finance', 'relationships', 'mindfulness', 'entertainment', 'meaning'];

    for (const category of validCategories) {
      const completedCount = user.completedTasks.filter(
        completion => completion.task.category === category
      ).length;

      const totalCount = await prisma.task.count({
        where: { 
          category,
          active: true
        }
      });

      categories[category] = {
        completed: completedCount,
        total: totalCount
      };
    }

    // Получаем статистику по задачам
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyTasks, weeklyTasks, monthlyTasks] = await Promise.all([
      prisma.taskCompletion.count({
        where: {
          userId: user.id,
          completedAt: { gte: startOfDay }
        }
      }),
      prisma.taskCompletion.count({
        where: {
          userId: user.id,
          completedAt: { gte: startOfWeek }
        }
      }),
      prisma.taskCompletion.count({
        where: {
          userId: user.id,
          completedAt: { gte: startOfMonth }
        }
      })
    ]);

    res.json({
      tasksCompleted: {
        daily: dailyTasks,
        weekly: weeklyTasks,
        monthly: monthlyTasks,
        total: user.completedTasks.length
      },
      categories,
      achievements: {
        unlocked: await prisma.userAchievement.count({
          where: { userId: user.id }
        }),
        total: await prisma.achievement.count()
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      message: 'Failed to fetch user stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;