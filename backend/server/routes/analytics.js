import { Router } from "express";
import pkg from "pg";
const { types } = pkg;

const router = Router();
import pool from "../database/connection.js";
const _query = pool.query.bind(pool);

// --- Setup pg parser override for BIGINT (OID 20) ---
types.setTypeParser(20, (val) => {
  const parsed = parseInt(val, 10);
  return Number.isSafeInteger(parsed) ? parsed : val;
});

// --- POST /analytics/aggregate ---
router.post("/aggregate", async (req, res) => {
  try {
    const {
      tableName, // Primary table
      xAxis, // { key: string, tableName: string }
      yAxes, // Array<{ key: string, tableName: string }>
      groupBy, // Optional: { key: string, tableName: string }
      aggregationTypes, // Array of aggregation types (e.g., SUM, COUNT)
      filters = [], // Array of filters { key, tableName, operator, value }
      secondaryTableNames = [], // Array of table names
      joinColumns = {}, // Object: { tableName: joinKey }
    } = req.body;

    // --- Validation ---
    if (
      !tableName ||
      !xAxis ||
      !xAxis.key ||
      !xAxis.tableName ||
      !yAxes ||
      yAxes.length === 0 ||
      !aggregationTypes ||
      aggregationTypes.length !== yAxes.length
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing or invalid parameters" });
    }

    for (const col of yAxes) {
      if (!col || !col.key || !col.tableName) {
        return res
          .status(400)
          .json({
            success: false,
            error: `Invalid yAxis column: ${JSON.stringify(col)}`,
          });
      }
    }

    if (groupBy && (!groupBy.key || !groupBy.tableName)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid groupBy column" });
    }

    // --- Aliases ---
    const primaryAlias = "t1";
    let aliasCounter = 2;
    const tableAliases = {}; // { tableName -> alias }

    secondaryTableNames.forEach((table) => {
      tableAliases[table] = `t${aliasCounter++}`;
    });

    const quoted = (str) => `"${str}"`;

    const getQualifiedColumn = ({ key, tableName }) => {
      if (!key || !tableName) throw new Error("Invalid column object");
      if (tableName === tableName) return `${primaryAlias}.${quoted(key)}`;
      const alias = tableAliases[tableName];
      if (!alias) throw new Error(`Missing alias for table: ${tableName}`);
      return `${alias}.${quoted(key)}`;
    };

    // --- SELECT clause ---
    const selectParts = [];
    const groupByParts = [];

    // X-axis
    const xCol = getQualifiedColumn(xAxis);
    selectParts.push(`${xCol} AS name`);
    groupByParts.push(xCol);

    // Group By (if different from xAxis)
    if (groupBy && groupBy.key !== xAxis.key) {
      const groupByCol = getQualifiedColumn(groupBy);
      selectParts.push(`${groupByCol} AS ${quoted(groupBy.key)}`);
      groupByParts.push(groupByCol);
    }

    // Y-axes with aggregation
    const allowedAggs = ["SUM", "COUNT", "AVG", "MIN", "MAX"];

    yAxes.forEach((col, idx) => {
      const agg = aggregationTypes[idx].toUpperCase();
      if (!allowedAggs.includes(agg)) {
        throw new Error(`Invalid aggregation type: ${agg}`);
      }
      const qualifiedCol = getQualifiedColumn(col);
      selectParts.push(
        `CAST(${agg}(${qualifiedCol}) AS BIGINT) AS ${quoted(col.key)}`
      );
    });

    // --- FROM and JOIN ---
    let query = `SELECT ${selectParts.join(", ")} FROM ${quoted(
      tableName
    )} AS ${primaryAlias}`;

    secondaryTableNames.forEach((t) => {
      const alias = tableAliases[t];
      const joinCol = joinColumns[t];
      if (!joinCol) throw new Error(`Missing join column for table ${t}`);
      query += ` INNER JOIN ${quoted(
        t
      )} AS ${alias} ON ${primaryAlias}.${quoted(joinCol)} = ${alias}.${quoted(
        joinCol
      )}`;
    });

    // --- WHERE clause ---
    const queryParams = [];
    if (filters.length > 0) {
      const whereParts = filters.map((filter, i) => {
        const qualified = getQualifiedColumn(filter);
        queryParams.push(filter.value);
        return `${qualified} ${filter.operator} $${queryParams.length}`;
      });
      query += ` WHERE ${whereParts.join(" AND ")}`;
    }

    // --- GROUP BY + ORDER BY ---
    if (groupByParts.length > 0) {
      query += ` GROUP BY ${groupByParts.join(
        ", "
      )} ORDER BY ${groupByParts.join(", ")}`;
    }

    console.log("Generated SQL Query:", query);

    // --- Execute query ---
    const result = await _query(query, queryParams);
    res.json({
      success: true,
      data: result.rows,
      query,
    });
  } catch (error) {
    console.error("Error in /aggregate:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to aggregate data: " + error.message,
      });
  }
});

export default router;
