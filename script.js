// script.js для тестового заполнения базы
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.createMany({
    data: [
      {
        category: 'finance',
        title: 'Проанализировать расходы',
        description: 'Просмотрите траты за последний день',
        xp: 50,
        type: 'daily',
        active: true
      },
      {
        category: 'relationships',
        title: 'Позвонить близким',
        description: 'Уделите время общению с семьей',
        xp: 30,
        type: 'daily',
        active: true
      },
      {
        category: 'mindfulness',
        title: 'Недельная медитация',
        description: 'Час медитации',
        xp: 100,
        type: 'weekly',
        active: true
      }
    ]
  });

  console.log('Added tasks:', tasks);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());