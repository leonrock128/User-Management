const { promisePool } = require('../config/db');

class UserModel {
  static async insertUsers(users) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      
      const query = `
        INSERT INTO users (uuid, name, email, city) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        email = VALUES(email),
        city = VALUES(city)
      `;
      
      for (const user of users) {
        await connection.query(query, [user.uuid, user.name, user.email, user.city]);
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAllUsers(limit, offset, filters = {}) {
    let query = 'SELECT uuid, name, email, city FROM users WHERE 1=1';
    const params = [];

    if (filters.name) {
      query += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }

    if (filters.email) {
      query += ' AND email LIKE ?';
      params.push(`%${filters.email}%`);
    }

    if (filters.city) {
      query += ' AND city LIKE ?';
      params.push(`%${filters.city}%`);
    }

    query += ' ORDER BY id LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await promisePool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (filters.name) {
      countQuery += ' AND name LIKE ?';
      countParams.push(`%${filters.name}%`);
    }

    if (filters.email) {
      countQuery += ' AND email LIKE ?';
      countParams.push(`%${filters.email}%`);
    }

    if (filters.city) {
      countQuery += ' AND city LIKE ?';
      countParams.push(`%${filters.city}%`);
    }

    const [countResult] = await promisePool.query(countQuery, countParams);
    
    return {
      users: rows,
      total: countResult[0].total
    };
  }

  static async updateUser(uuid, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }

    if (updates.city !== undefined) {
      fields.push('city = ?');
      values.push(updates.city);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(uuid);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE uuid = ?`;
    const [result] = await promisePool.query(query, values);

    return result.affectedRows > 0;
  }

  static async getUserByUuid(uuid) {
    const [rows] = await promisePool.query(
      'SELECT uuid, name, email, city FROM users WHERE uuid = ?',
      [uuid]
    );
    return rows[0];
  }

  static async getUserCount() {
    const [rows] = await promisePool.query('SELECT COUNT(*) as count FROM users');
    return rows[0].count;
  }
}

module.exports = UserModel;