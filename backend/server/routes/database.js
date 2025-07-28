import { Router } from 'express';
const router = Router();
import pool from "../database/connection.js";
const _query = pool.query.bind(pool);


// Get all tables in the database
router.get('/tables', async (req, res) => {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await _query(query);
    const tables = result.rows.map(row => row.table_name);
    
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
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const result = await _query(query, [tableName]);
    
    const columns = result.rows.map(row => ({
      key: row.column_name,
      label: row.column_name.charAt(0).toUpperCase() + row.column_name.slice(1).replace(/_/g, ' '),
      type: mapPostgresTypeToChartType(row.data_type),
      dataType: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default
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
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `;
    
    const tableExists = await _query(tableExistsQuery, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    let query = `SELECT * FROM "${tableName}"`;
    const queryParams = [];
    
    if (orderBy) {
      query += ` ORDER BY "${orderBy}" ${orderDirection}`;
    }
    
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await _query(query, queryParams);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM "${tableName}"`;
    const countResult = await _query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      tableName: tableName,
      data: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + result.rows.length < totalCount
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

// Execute custom query for advanced analytics
router.post('/query', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    // Basic validation - only allow SELECT statements
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT queries are allowed'
      });
    }
    
    const result = await _query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute query: ' + error.message
    });
  }
});

// Helper function to map PostgreSQL data types to chart types
function mapPostgresTypeToChartType(postgresType) {
  const numericTypes = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision', 'smallint'];
  const dateTypes = ['date', 'timestamp', 'timestamp with time zone', 'timestamp without time zone'];
  
  if (numericTypes.includes(postgresType)) {
    return 'number';
  } else if (dateTypes.includes(postgresType)) {
    return 'date';
  } else {
    return 'string';
  }
}

export default router;