const taskTemplates = {
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
      },
      {
        category: 'meaning',
        title: 'Рефлексия дня',
        description: 'Запишите три главных вывода за день',
        xp: 35,
      },
      {
        category: 'health',
        title: 'Прогулка',
        description: 'Совершите 30-минутную прогулку',
        xp: 45,
      }
    ],
    weekly: [
      {
        category: 'finance',
        title: 'Недельный финансовый обзор',
        description: 'Проанализируйте все траты за неделю и составьте план на следующую',
        xp: 100,
      },
      {
        category: 'relationships',
        title: 'Встреча с друзьями',
        description: 'Организуйте встречу с близкими друзьями',
        xp: 80,
      },
      {
        category: 'mindfulness',
        title: 'Практика осознанности',
        description: 'Уделите час медитации и рефлексии',
        xp: 90,
      }
    ],
    monthly: [
      {
        category: 'finance',
        title: 'Месячный финансовый отчет',
        description: 'Подведите итоги месяца и скорректируйте финансовые цели',
        xp: 200,
      },
      {
        category: 'meaning',
        title: 'Анализ целей',
        description: 'Проверьте прогресс по целям и скорректируйте планы',
        xp: 180,
      },
      {
        category: 'health',
        title: 'Медицинский чекап',
        description: 'Запланируйте или пройдите профилактический осмотр',
        xp: 150,
      }
    ]
  };
  
  module.exports = taskTemplates;