const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();

router.post('/users/fetch', UserController.fetchAndStoreUsers);
router.get('/users', UserController.getUsers);
router.put('/users/:uuid', UserController.updateUser);

module.exports = router;