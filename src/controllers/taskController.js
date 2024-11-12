const taskService = require('../services/taskService');

exports.getTasks = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({ message: 'Неверный тип заданий' });
    }

    const tasks = await taskService.getTasks(type, req.user.id);
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

exports.completeTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const completedTask = await taskService.completeTask(taskId, req.user.id);
    res.json(completedTask);
  } catch (error) {
    next(error);
  }
};