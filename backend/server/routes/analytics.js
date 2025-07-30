import { Router } from "express";
const router = Router();
import pool from "../database/connection.js";
const _query = pool.query.bind(pool);

// Get aggregated data for charts
router.post("/aggregate", async (req, res) => {
  try {
    const {
      tableName,
      xAxis,
      yAxes,
      groupBy,
      aggregationTypes, // Now an array
      filters = [],
    } = req.body;

    // Validate inputs
    if (
      !tableName ||
      !xAxis ||
      !yAxes ||
      yAxes.length === 0 ||
      !aggregationTypes ||
      aggregationTypes.length !== yAxes.length
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid required parameters",
      });
    }

    // Build the aggregation query
    let selectClause = `"${xAxis}" as name`;

    // Add Y-axis aggregations with specific aggregation types
    yAxes.forEach((yAxis, index) => {
      const aggType = aggregationTypes[index];
      selectClause += `, ${aggType}("${yAxis}") as "${yAxis}"`;
    });

    // Add group by if specified
    if (groupBy) {
      selectClause += `, "${groupBy}" as group_by`;
    }

    let query = `SELECT ${selectClause} FROM "${tableName}"`;
    const queryParams = [];

    // Add filters
    if (filters.length > 0) {
      const filterClauses = filters.map((filter, index) => {
        queryParams.push(filter.value);
        return `"${filter.column}" ${filter.operator} $${queryParams.length}`;
      });
      query += ` WHERE ${filterClauses.join(" AND ")}`;
    }

    // Add GROUP BY clause
    let groupByClause = `"${xAxis}"`;
    if (groupBy) {
      groupByClause += `, "${groupBy}"`;
    }
    query += ` GROUP BY ${groupByClause}`;
    query += ` ORDER BY ${groupByClause}`;

    const result = await _query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      query: query, // For debugging
    });
  } catch (error) {
    console.error("Error in aggregation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to aggregate data: " + error.message,
    });
  }
});

// Get summary statistics for a table
router.get("/tables/:tableName/stats", async (req, res) => {
  try {
    const { tableName } = req.params;

    // Get numeric columns for statistics
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public'
      AND data_type IN ('integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision', 'smallint')
    `;

    const columnsResult = await _query(columnsQuery, [tableName]);
    const numericColumns = columnsResult.rows.map((row) => row.column_name);

    if (numericColumns.length === 0) {
      return res.json({
        success: true,
        stats: {},
        message: "No numeric columns found for statistics",
      });
    }

    // Build statistics query
    const statsSelects = numericColumns
      .map(
        (col) =>
          `COUNT("${col}") as "${col}_count",
       AVG("${col}") as "${col}_avg",
       MIN("${col}") as "${col}_min",
       MAX("${col}") as "${col}_max",
       SUM("${col}") as "${col}_sum"`
      )
      .join(", ");

    const statsQuery = `SELECT ${statsSelects} FROM "${tableName}"`;
    const statsResult = await _query(statsQuery);

    // Get total row count
    const countQuery = `SELECT COUNT(*) as total_rows FROM "${tableName}"`;
    const countResult = await _query(countQuery);

    const stats = {
      totalRows: parseInt(countResult.rows[0].total_rows),
      columns: {},
    };

    // Process statistics for each column
    numericColumns.forEach((col) => {
      const row = statsResult.rows[0];
      stats.columns[col] = {
        count: parseInt(row[`${col}_count`]) || 0,
        average: parseFloat(row[`${col}_avg`]) || 0,
        minimum: parseFloat(row[`${col}_min`]) || 0,
        maximum: parseFloat(row[`${col}_max`]) || 0,
        sum: parseFloat(row[`${col}_sum`]) || 0,
      };
    });

    res.json({
      success: true,
      tableName: tableName,
      stats: stats,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
});

export default router;
