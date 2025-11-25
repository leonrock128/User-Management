const axios = require('axios');
const UserModel = require('../models/userModel');

class UserController {
  static async fetchAndStoreUsers(req, res) {
    try {
      const targetCount = 1000;
      const existingCount = await UserModel.getUserCount();

      if (existingCount >= targetCount) {
        return res.status(200).json({
          success: true,
          message: `Database already contains ${existingCount} users`,
          count: existingCount
        });
      }

      let totalFetched = 0;
      const batchSize = 50;
      const totalBatches = Math.ceil((targetCount - existingCount) / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const response = await axios.get(
          `https://randomuser.me/api/?results=${batchSize}&page=${i + 1}`
        );

        const users = response.data.results.map(user => ({
          uuid: user.login.uuid,
          name: `${user.name.first} ${user.name.last}`,
          email: user.email,
          city: user.location.city
        }));

        await UserModel.insertUsers(users);
        totalFetched += users.length;

        console.log(`Batch ${i + 1}/${totalBatches} completed. Fetched: ${totalFetched}`);
      }

      const finalCount = await UserModel.getUserCount();

      res.status(200).json({
        success: true,
        message: 'Users fetched and stored successfully',
        fetched: totalFetched,
        total: finalCount
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

 static async getUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 25;
    
    if (limit <= 0 || limit === -1) {
      limit = 25; 
    }
    if (limit > 1000) {
      limit = 1000;
    }
    
    const offset = (page - 1) * limit;

      const filters = {
        name: req.query.name || '',
        email: req.query.email || '',
        city: req.query.city || ''
      };

      const result = await UserModel.getAllUsers(limit, offset, filters);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

  static async updateUser(req, res) {
    try {
      const { uuid } = req.params;
      const { name, email, city } = req.body;

      if (!uuid) {
        return res.status(400).json({
          success: false,
          message: 'UUID is required'
        });
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (city !== undefined) updates.city = city;

      const updated = await UserModel.updateUser(uuid, updates);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = await UserModel.getUserByUuid(uuid);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }
}

module.exports = UserController;