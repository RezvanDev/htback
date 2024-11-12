const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Получение списка задач
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    console.log('Request headers:', req.headers);
    console.log('Auth data:', req.headers['x-telegram-auth-data']);
    
    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid task type. Must be daily, weekly, or monthly'
      });
    }

    let user;
    const authData = req.headers['x-telegram-auth-data'];
    if (authData) {
      const { id } = JSON.parse(authData);
      console.log('Looking for user with telegramId:', id);
      user = await prisma.user.findUnique({
        where: { telegramId: id.toString() }
      });

      if (!user) {
        // Создаем пользователя если он не существует
        const { first_name, last_name, username } = JSON.parse(authData);
        user = await prisma.user.create({
          data: {
            telegramId: id.toString(),
            firstName: first_name,
            lastName: last_name,
            username: username,
          }
        });
        console.log('Created new user:', user);
      }
    }

    // Получаем задания
    const tasks = await prisma.task.findMany({
      where: {
        type,
        active: true
      },
      include: user ? {
        completions: {
          where: {
            userId: user.id,
            completedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }
      } : undefined
    });

    console.log(`Found ${tasks.length} tasks for type ${type}`);

    // Форматируем ответ
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      category: task.category,
      title: task.title,
      description: task.description,
      xp: task.xp,
      completed: user ? task.completions.length > 0 : false
    }));

    res.json({
      tasks: formattedTasks,
      totalXP: formattedTasks.filter(t => !t.completed).reduce((sum, task) => sum + task.xp, 0)
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      message: 'Failed to fetch tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Отметка о выполнении задачи
router.post('/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const authData = req.headers['x-telegram-auth-data'];
    
    if (!authData) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id } = JSON.parse(authData);
    let user = await prisma.user.findUnique({
      where: { telegramId: id.toString() }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        completions: {
          where: {
            userId: user.id,
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

    if (!task.active) {
      return res.status(400).json({ message: 'Task is no longer active' });
    }

    if (task.completions.length > 0) {
      return res.status(400).json({ message: 'Task already completed today' });
    }

    // Выполняем в транзакции
    const [completion, updatedUser] = await prisma.$transaction([
      prisma.taskCompletion.create({
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

    console.log(`Task ${taskId} completed by user ${user.id}, awarded ${task.xp} XP`);

    res.json({
      ...task,
      completed: true,
      xp: task.xp
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      message: 'Failed to complete task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;