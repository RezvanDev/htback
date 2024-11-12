const achievementsService = require('../services/achievementsService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AchievementsController {
  // Получение достижений пользователя
  async getUserAchievements(req, res) {
    try {
      const { id: telegramId } = req.telegramUser;

      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Проверяем новые достижения
      await achievementsService.checkAchievements(user.id);

      // Получаем обновленный список достижений
      const achievements = await achievementsService.getUserAchievements(user.id);

      // Форматируем статистику
      const stats = {
        totalXP: user.totalXP,
        achievementsUnlocked: achievements.filter(a => a.unlocked).length,
        totalAchievements: achievements.length,
      };

      res.json({ achievements, stats });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({
        message: 'Failed to fetch achievements',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Получение лидерборда
  async getLeaderboard(req, res) {
    try {
      const { id: telegramId } = req.telegramUser;
      const leaderboard = await achievementsService.getLeaderboard();

      const currentUser = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          id: true,
          firstName: true,
          username: true,
          totalXP: true,
        }
      });

      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Находим позицию пользователя
      const userPosition = await prisma.user.count({
        where: {
          totalXP: {
            gt: currentUser.totalXP
          }
        }
      });

      const currentUserData = {
        position: userPosition + 1,
        name: currentUser.firstName || currentUser.username || 'Пользователь',
        xp: currentUser.totalXP,
      };

      res.json({ leaderboard, currentUser: currentUserData });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        message: 'Failed to fetch leaderboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AchievementsController();