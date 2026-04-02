
const express = require('express');
const router = express.Router();
const controller = require('../controllers/project.controller');
const auth = require('../middleware/auth');

router.get('/', auth, controller.getProjects);

module.exports = router;
