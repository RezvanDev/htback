const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProfileController {
  // Получение профиля пользователя
  async getProfile(req, res) {
    try {
      const { id: telegramId } = req.telegramUser;

      let user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        // Создаем пользователя если его нет
        user = await prisma.user.create({
          data: {
            telegramId,
            username: req.telegramUser.username,
            firstName: req.telegramUser.firstName,
            lastName: req.telegramUser.lastName,
            totalXP: 0
          }
        });
      }

      // Рассчитываем уровень
      const level = Math.floor(user.totalXP / 1000) + 1;
      const nextLevelXP = level * 1000;

      // Формируем ответ
      res.json({
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        totalXP: user.totalXP,
        level,
        nextLevelXP
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ message: 'Failed to get profile' });
    }
  }

  // Получение статистики пользователя
  async getUserStats(req, res) {
    try {
      const { id: telegramId } = req.telegramUser;

      const user = await prisma.user.findUnique({
        where: { telegramId },
        include: {
          completedTasks: {
            include: { task: true }
          },
          userTasks: {
            include: { completions: true }
          },
          userAchievements: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Рассчитываем статистику по задачам
      const tasksCompleted = {
        daily: await this.getTasksCompletedToday(user),
        weekly: await this.getTasksCompletedThisWeek(user),
        monthly: await this.getTasksCompletedThisMonth(user),
        total: user.completedTasks.length + 
               user.userTasks.reduce((sum, task) => sum + task.completions.length, 0)
      };

      // Рассчитываем статистику по категориям
      const categories = await this.getCategoryStats(user);

      // Рассчитываем серию выполнения
      const streak = await this.calculateStreak(user);

      // Получаем статистику достижений
      const achievements = {
        unlocked: user.userAchievements.length,
        total: await prisma.achievement.count()
      };

      res.json({
        tasksCompleted,
        categories,
        streak,
        achievements
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({ message: 'Failed to get user stats' });
    }
  }

  // Вспомогательные методы
  async getTasksCompletedToday(user) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return this.getTasksCompletedSince(user, startOfDay);
  }

  async getTasksCompletedThisWeek(user) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    return this.getTasksCompletedSince(user, startOfWeek);
  }

  async getTasksCompletedThisMonth(user) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return this.getTasksCompletedSince(user, startOfMonth);
  }

  async getTasksCompletedSince(user, date) {
    const systemTasks = user.completedTasks.filter(
      t => t.completedAt >= date
    ).length;

    const userTasks = user.userTasks.reduce((sum, task) => 
      sum + task.completions.filter(c => c.completedAt >= date).length, 0
    );

    return systemTasks + userTasks;
  }

  async getCategoryStats(user) {
    const categories = {};
    const validCategories = ['finance', 'relationships', 'mindfulness', 'entertainment', 'meaning'];

    for (const category of validCategories) {
      const completed = user.completedTasks.filter(
        completion => completion.task.category === category
      ).length;

      const total = await prisma.task.count({
        where: { 
          category,
          active: true
        }
      });

      categories[category] = { completed, total };
    }

    return categories;
  }

  async calculateStreak(user) {
    let current = 0;
    let longest = 0;
    let lastActivity = null;

    // Получаем все даты выполнения задач
    const completionDates = [
      ...user.completedTasks.map(t => t.completedAt),
      ...user.userTasks.flatMap(t => t.completions.map(c => c.completedAt))
    ].sort((a, b) => b - a);

    if (completionDates.length > 0) {
      lastActivity = completionDates[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastActivity >= today) {
        current = 1;
        let streakDate = new Date(today);
        streakDate.setDate(streakDate.getDate() - 1);

        for (const date of completionDates) {
          const completionDate = new Date(date);
          completionDate.setHours(0, 0, 0, 0);
          
          if (completionDate.getTime() === streakDate.getTime()) {
            current++;
            streakDate.setDate(streakDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      longest = Math.max(current, longest);
    }

    return {
      current,
      longest,
      lastActivity: lastActivity?.toISOString()
    };
  }
}

module.exports = new ProfileController();