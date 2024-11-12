const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserTasksController {
  // Получение списка пользовательских задач
  async getTasks(req, res) {
    try {
      const { id: telegramId } = req.telegramUser;

      let user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        // Создаем пользователя если он не существует
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

      // Получаем задачи
      const tasks = await prisma.userTask.findMany({
        where: {
          userId: user.id,
          active: true
        },
        include: {
          completions: {
            where: {
              completedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }
        }
      });

      // Форматируем ответ
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        repeat: task.repeat,
        deadline: task.deadline,
        xp: task.xp,
        completed: task.completions.length > 0,
        createdAt: task.createdAt
      }));

      res.json({ tasks: formattedTasks });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      res.status(500).json({
        message: 'Failed to fetch tasks',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Создание новой задачи
  async createTask(req, res) {
    try {
      const { id: telegramId } = req.telegramUser;
      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { title, description, category, priority, repeat, deadline } = req.body;

      // Валидация обязательных полей
      if (!title || !category || !priority || !repeat) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Создаем задачу
      const task = await prisma.userTask.create({
        data: {
          userId: user.id,
          title,
          description,
          category,
          priority,
          repeat,
          deadline: deadline ? new Date(deadline) : null,
          xp: 10 // Фиксированное значение
        }
      });

      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating user task:', error);
      res.status(500).json({
        message: 'Failed to create task',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Отметка о выполнении задачи
  async completeTask(req, res) {
    try {
      const { taskId } = req.params;
      const { id: telegramId } = req.telegramUser;
      
      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Проверяем существование задачи
      const task = await prisma.userTask.findFirst({
        where: { 
          id: taskId,
          userId: user.id,
          active: true
        },
        include: {
          completions: {
            where: {
              completedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }
        }
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (task.completions.length > 0) {
        return res.status(400).json({ message: 'Task already completed today' });
      }

      // Выполняем в транзакции
      const [completion, updatedUser] = await prisma.$transaction([
        prisma.userTaskCompletion.create({
          data: {
            taskId,
            userId: user.id
          }
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            totalXP: {
              increment: task.xp
            }
          }
        })
      ]);

      res.json({
        message: 'Task completed successfully',
        xpEarned: task.xp,
        totalXP: updatedUser.totalXP
      });
    } catch (error) {
      console.error('Error completing user task:', error);
      res.status(500).json({
        message: 'Failed to complete task',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Удаление задачи
  async deleteTask(req, res) {
    try {
      const { taskId } = req.params;
      const { id: telegramId } = req.telegramUser;
      
      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await prisma.userTask.updateMany({
        where: {
          id: taskId,
          userId: user.id
        },
        data: {
          active: false
        }
      });

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting user task:', error);
      res.status(500).json({
        message: 'Failed to delete task',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new UserTasksController();