import { Router } from "express";
const router = Router();
import pool from "../database/connection.js";
const _query = pool.query.bind(pool);

// POST /analytics/aggregate
router.post("/aggregate", async (req, res) => {
  try {
    const {
      tableName,
      xAxis,
      yAxes,
      groupBy,
      aggregationTypes,
      filters = [],
    } = req.body;

    // Basic validation
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

    const quoted = (col) => `"${col}"`;

    // Build SELECT clause
    const selectParts = [`${quoted(xAxis)} AS name`];
    const groupByParts = [quoted(xAxis)];

    if (groupBy && groupBy !== xAxis) {
      selectParts.push(`${quoted(groupBy)} AS group_by`);
      groupByParts.push(quoted(groupBy));
    }

    yAxes.forEach((col, idx) => {
      const agg = aggregationTypes[idx];
      selectParts.push(`${agg}(${quoted(col)}) AS ${quoted(col)}`);
    });

    // Base query
    let query = `SELECT ${selectParts.join(", ")} FROM ${quoted(tableName)}`;
    const queryParams = [];

    // WHERE clause (filters)
    if (filters.length > 0) {
      const whereParts = filters.map((filter, i) => {
        queryParams.push(filter.value);
        return `${quoted(filter.column)} ${filter.operator} $${
          queryParams.length
        }`;
      });
      query += ` WHERE ${whereParts.join(" AND ")}`;
    }

    // GROUP BY and ORDER BY
    query += ` GROUP BY ${groupByParts.join(", ")}`;
    query += ` ORDER BY ${groupByParts.join(", ")}`;

    // Execute and return
    const result = await _query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      query, // optional: for debugging
    });
  } catch (error) {
    console.error("Error in /aggregate:", error);
    res.status(500).json({
      success: false,
      error: "Failed to aggregate data: " + error.message,
    });
  }
});

export default router;
