const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const achievements = [
  // Достижения за количество выполненных задач
  {
    title: 'Первые шаги',
    description: 'Выполните первые 5 задач',
    type: 'TASK_COUNT',
    rarity: 'common',
    requirement: 5,
    xpReward: 50,
    icon: 'star'
  },
  {
    title: 'Начинающий исполнитель',
    description: 'Выполните 25 задач',
    type: 'TASK_COUNT',
    rarity: 'common',
    requirement: 25,
    xpReward: 100,
    icon: 'award'
  },
  {
    title: 'Мастер задач',
    description: 'Выполните 100 задач',
    type: 'TASK_COUNT',
    rarity: 'rare',
    requirement: 100,
    xpReward: 250,
    icon: 'trophy'
  },
  {
    title: 'Легенда продуктивности',
    description: 'Выполните 500 задач',
    type: 'TASK_COUNT',
    rarity: 'legendary',
    requirement: 500,
    xpReward: 1000,
    icon: 'crown'
  },

  // Достижения за XP
  {
    title: 'Первая сотня',
    description: 'Наберите 100 XP',
    type: 'XP_TOTAL',
    rarity: 'common',
    requirement: 100,
    xpReward: 50,
    icon: 'circle'
  },
  {
    title: 'На пути к успеху',
    description: 'Наберите 500 XP',
    type: 'XP_TOTAL',
    rarity: 'rare',
    requirement: 500,
    xpReward: 100,
    icon: 'target'
  },
  {
    title: 'Профессионал',
    description: 'Наберите 2000 XP',
    type: 'XP_TOTAL',
    rarity: 'epic',
    requirement: 2000,
    xpReward: 300,
    icon: 'medal'
  },
  {
    title: 'Гуру',
    description: 'Наберите 5000 XP',
    type: 'XP_TOTAL',
    rarity: 'legendary',
    requirement: 5000,
    xpReward: 1000,
    icon: 'star'
  },

  // Достижения за категории
  {
    title: 'Финансовый стратег',
    description: 'Выполните 50 финансовых задач',
    type: 'CATEGORY_FINANCE',
    rarity: 'epic',
    requirement: 50,
    xpReward: 500,
    icon: 'dollar-sign'
  },
  {
    title: 'Мастер медитации',
    description: 'Выполните 30 задач по осознанности',
    type: 'CATEGORY_MINDFULNESS',
    rarity: 'epic',
    requirement: 30,
    xpReward: 500,
    icon: 'brain'
  }
];

async function seed() {
  try {
    console.log('Starting seed...');

    // Удаляем существующие достижения
    await prisma.achievement.deleteMany();

    // Создаем новые достижения
    for (const achievement of achievements) {
      await prisma.achievement.create({
        data: achievement
      });
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();