const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AchievementsService {
  // Проверяет и обновляет достижения пользователя
  async checkAchievements(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          completedTasks: {
            include: {
              task: true
            }
          },
          userTasks: {
            include: {
              completions: true
            }
          },
          userAchievements: true
        }
      });

      const achievements = await prisma.achievement.findMany({
        include: {
          userAchievements: {
            where: { userId }
          }
        }
      });

      const updates = [];

      for (const achievement of achievements) {
        const userAchievement = achievement.userAchievements[0];
        let progress = 0;

        // Вычисляем прогресс в зависимости от типа достижения
        switch (achievement.type) {
          case 'TASK_COUNT':
            // Считаем все выполненные задачи (системные и пользовательские)
            progress = user.completedTasks.length + 
              user.userTasks.reduce((sum, task) => sum + task.completions.length, 0);
            break;

          case 'XP_TOTAL':
            progress = user.totalXP;
            break;

          case 'CATEGORY_FINANCE':
            progress = this.countCategoryTasks(user, 'finance');
            break;

          case 'CATEGORY_MINDFULNESS':
            progress = this.countCategoryTasks(user, 'mindfulness');
            break;
        }

        // Если достижение ещё не получено и прогресс достаточный
        if (!userAchievement && progress >= achievement.requirement) {
          updates.push(
            prisma.userAchievement.create({
              data: {
                userId,
                achievementId: achievement.id,
                progress
              }
            })
          );

          // Начисляем XP за достижение
          updates.push(
            prisma.user.update({
              where: { id: userId },
              data: {
                totalXP: {
                  increment: achievement.xpReward
                }
              }
            })
          );
        }
        // Если достижение есть, но нужно обновить прогресс
        else if (userAchievement && progress > userAchievement.progress) {
          updates.push(
            prisma.userAchievement.update({
              where: {
                id: userAchievement.id
              },
              data: {
                progress
              }
            })
          );
        }
      }

      // Выполняем все обновления в транзакции
      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }

      return true;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return false;
    }
  }

  // Подсчет задач определенной категории
  countCategoryTasks(user, category) {
    const systemTasks = user.completedTasks.filter(
      completion => completion.task.category === category
    ).length;

    const userTasks = user.userTasks.reduce((sum, task) => 
      task.category === category ? sum + task.completions.length : sum, 0
    );

    return systemTasks + userTasks;
  }

  // Получение всех достижений пользователя с прогрессом
  async getUserAchievements(userId) {
    try {
      const achievements = await prisma.achievement.findMany({
        include: {
          userAchievements: {
            where: { userId }
          }
        }
      });

      // Получаем текущий прогресс для всех достижений
      await this.checkAchievements(userId);

      // Форматируем данные для фронтенда
      return achievements.map(achievement => {
        const userAchievement = achievement.userAchievements[0];
        return {
          ...achievement,
          unlocked: !!userAchievement,
          progress: userAchievement?.progress || 0,
          progressPercentage: Math.min(
            Math.round((userAchievement?.progress || 0) / achievement.requirement * 100),
            100
          )
        };
      });
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      throw error;
    }
  }

  // Получение лидерборда
  async getLeaderboard() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          totalXP: true,
          userAchievements: {
            select: {
              achievement: true
            }
          }
        },
        orderBy: {
          totalXP: 'desc'
        },
        take: 10
      });

      return users.map((user, index) => ({
        position: index + 1,
        name: user.firstName || user.username || 'Пользователь',
        xp: user.totalXP,
        achievementsCount: user.userAchievements.length,
        // Добавляем высшее достижение пользователя
        topAchievement: this.getTopAchievement(user.userAchievements)
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  // Получение самого ценного достижения пользователя
  getTopAchievement(userAchievements) {
    if (userAchievements.length === 0) return null;

    const rarityOrder = {
      'legendary': 4,
      'epic': 3,
      'rare': 2,
      'common': 1
    };

    return userAchievements
      .map(ua => ua.achievement)
      .sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity])[0];
  }
}

module.exports = new AchievementsService();