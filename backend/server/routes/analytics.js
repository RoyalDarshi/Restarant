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

    const quote = (s) => `"${s}"`;
    const selectParts = [`${quote(xAxis)} AS name`];
    const groupByParts = [quote(xAxis)];

    if (groupBy && groupBy !== xAxis) {
      selectParts.push(`${quote(groupBy)} AS group_by`);
      groupByParts.push(quote(groupBy));
    }

    yAxes.forEach((col, idx) => {
      const agg = aggregationTypes[idx];
      selectParts.push(`${agg}(${quote(col)}) AS ${quote(col)}`);
    });

    let query = `SELECT ${selectParts.join(", ")} FROM ${quote(tableName)}`;
    const queryParams = [];

    if (filters.length > 0) {
      const whereClauses = filters.map((filter) => {
        if (filter.operator === "BETWEEN" && Array.isArray(filter.value)) {
          queryParams.push(filter.value[0], filter.value[1]);
          const startIdx = queryParams.length - 1;
          const endIdx = queryParams.length;
          return `${quote(filter.column)} BETWEEN $${startIdx} AND $${endIdx}`;
        } else {
          queryParams.push(filter.value);
          return `${quote(filter.column)} ${filter.operator} $${
            queryParams.length
          }`;
        }
      });
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }


    query += ` GROUP BY ${groupByParts.join(", ")}`;
    query += ` ORDER BY ${groupByParts.join(", ")}`;

    const result = await _query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      query, // For frontend debugging
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
