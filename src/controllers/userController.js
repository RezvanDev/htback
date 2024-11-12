const prisma = require('../config/database');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { telegramId: req.telegramId } });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { username, firstName, lastName } = req.body;
    const updatedUser = await prisma.user.update({
      where: { telegramId: req.telegramId },
      data: { username, firstName, lastName }
    });
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};