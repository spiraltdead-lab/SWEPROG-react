
const service = require('../services/project.service');

async function getProjects(req, res) {
  try {
    const data = await service.getProjects(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getProjects };
