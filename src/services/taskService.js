const prisma = require('../config/database');

class TaskService {
  async getTasks(type, userId) {
    // Получаем текущую дату
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Определяем период актуальности для каждого типа заданий
    const periodStart = {
      daily: startOfDay,
      weekly: startOfWeek,
      monthly: startOfMonth
    }[type];

    // Получаем активные задания и информацию о их выполнении текущим пользователем
    const tasks = await prisma.task.findMany({
      where: {
        type,
        active: true,
      },
      include: {
        completions: {
          where: {
            userId,
            completedAt: {
              gte: periodStart
            }
          }
        }
      }
    });

    // Форматируем данные для фронтенда
    return tasks.map(task => ({
      id: task.id,
      category: task.category,
      title: task.title,
      description: task.description,
      xp: task.xp,
      completed: task.completions.length > 0
    }));
  }

  async completeTask(taskId, userId) {
    // Начинаем транзакцию
    return await prisma.$transaction(async (tx) => {
      // Получаем задание
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          completions: {
            where: {
              userId,
              completedAt: {
                gte: this._getPeriodStart(task.type)
              }
            }
          }
        }
      });

      if (!task || !task.active) {
        throw new Error('Задание не найдено или неактивно');
      }

      // Проверяем, не было ли уже выполнено
      if (task.completions.length > 0) {
        throw new Error('Задание уже выполнено');
      }

      // Создаем запись о выполнении
      await tx.taskCompletion.create({
        data: {
          taskId,
          userId,
        }
      });

      // Обновляем XP пользователя
      await tx.user.update({
        where: { id: userId },
        data: {
          totalXP: {
            increment: task.xp
          }
        }
      });

      return {
        ...task,
        completed: true
      };
    });
  }

  _getPeriodStart(type) {
    const now = new Date();
    switch (type) {
      case 'daily':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'weekly':
        return new Date(now.setDate(now.getDate() - now.getDay()));
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        throw new Error('Неизвестный тип задания');
    }
  }
}

module.exports = new TaskService();