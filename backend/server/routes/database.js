import { Router } from 'express';
import { _query } from '../database/connection.js';  // Importing _query from mysql2 connection
const router = Router();

// Get all tables in the database
router.get('/tables', async (req, res) => {
  try {
    const query = `SHOW TABLES`;
    const result = await _query(query);
    const tables = result.map(row => Object.values(row)[0]);

    res.json({
      success: true,
      tables: tables
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables'
    });
  }
});

// Get columns for a specific table
router.get('/tables/:tableName/columns', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const query = `
      DESCRIBE ${tableName}
    `;
    
    const result = await _query(query);
    
    const columns = result.map(row => ({
      key: row.Field,
      label: row.Field.charAt(0).toUpperCase() + row.Field.slice(1).replace(/_/g, ' '),
      type: row.Type,
      nullable: row.Null === 'YES',
      defaultValue: row.Default
    }));
    
    res.json({
      success: true,
      tableName: tableName,
      columns: columns
    });
  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch columns'
    });
  }
});

// Get data from a specific table
router.get('/tables/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 1000, offset = 0, orderBy, orderDirection = 'ASC' } = req.query;
    
    // Validate table name to prevent SQL injection
    const tableExistsQuery = `
      SELECT COUNT(*) AS count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `;
    
    const tableExists = await _query(tableExistsQuery, [tableName]);
    
    if (tableExists[0].count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    let query = `SELECT * FROM ${tableName}`;
    const queryParams = [];
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    }
    
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const result = await _query(query, queryParams);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) AS total FROM ${tableName}`;
    const countResult = await _query(countQuery);
    const totalCount = countResult[0].total;
    
    res.json({
      success: true,
      tableName: tableName,
      data: result,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + result.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data'
    });
  }
});

export default router;
