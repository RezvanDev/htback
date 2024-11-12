const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TaskGenerator {
  constructor() {
    this.taskTemplates = {
      daily: [
        {
          category: 'finance',
          title: 'Проанализировать расходы',
          description: 'Просмотрите траты за последний день',
          xp: 50,
        },
        {
          category: 'relationships',
          title: 'Позвонить близким',
          description: 'Уделите время общению с семьей',
          xp: 30,
        },
        {
          category: 'mindfulness',
          title: 'Медитация',
          description: '15 минут осознанной практики',
          xp: 40,
        }
      ],
      weekly: [
        {
          category: 'finance',
          title: 'Недельный финансовый обзор',
          description: 'Проанализируйте траты за неделю',
          xp: 100,
        },
        {
          category: 'health',
          title: 'Спортивная неделя',
          description: 'Выполните три тренировки',
          xp: 120,
        }
      ],
      monthly: [
        {
          category: 'goals',
          title: 'Анализ целей',
          description: 'Оцените прогресс по целям месяца',
          xp: 200,
        },
        {
          category: 'health',
          title: 'Медицинский чекап',
          description: 'Запланируйте или пройдите осмотр',
          xp: 150,
        }
      ]
    };
  }

  async generateTasks() {
    const now = new Date();
    
    try {
      // Ежедневные задания генерируем всегда
      await this._generateTasksForType('daily');
      console.log('Daily tasks generated');

      // Еженедельные задания генерируем в воскресенье
      if (now.getDay() === 0) {
        await this._generateTasksForType('weekly');
        console.log('Weekly tasks generated');
      }

      // Ежемесячные задания генерируем в первый день месяца
      if (now.getDate() === 1) {
        await this._generateTasksForType('monthly');
        console.log('Monthly tasks generated');
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      throw error;
    }
  }

  async _generateTasksForType(type) {
    const templates = this.taskTemplates[type];

    await prisma.$transaction(async (tx) => {
      // Деактивируем старые задания
      await tx.task.updateMany({
        where: { 
          type,
          active: true 
        },
        data: { 
          active: false 
        }
      });

      // Создаем новые задания
      for (const template of templates) {
        await tx.task.create({
          data: {
            ...template,
            type,
            active: true
          }
        });
      }
    });

    console.log(`Generated ${templates.length} ${type} tasks`);
  }
}

module.exports = new TaskGenerator();