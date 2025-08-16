import { Router } from "express";
import { _query } from "../database/connection.js";  // Importing _query from mysql2 connection
const router = Router();

// POST /analytics/aggregate
router.post("/aggregate", async (req, res) => {
  try {
    const {
      tableName, // Primary table
      xAxis, // Expected to be { key: string, tableName: string }
      yAxes, // Array<{ key: string, tableName: string }>
      groupBy, // Optional: { key: string, tableName: string }
      aggregationTypes, // Array of aggregation function names like 'SUM', 'COUNT'
      filters = [],
      secondaryTableName, // Optional: table for join
      joinColumn, // Optional: column to join on
    } = req.body;

    // --- Debug Logging ---
    console.log("Received Aggregation Request:");
    console.log("  Primary Table:", tableName);
    console.log("  Secondary Table:", secondaryTableName);
    console.log("  Join Column:", joinColumn);
    console.log("  X-Axis:", xAxis?.key, "from", xAxis?.tableName);
    yAxes.forEach((col, i) => {
      console.log(`  Y-Axis ${i + 1}:`, col?.key, "from", col?.tableName);
    });
    if (groupBy) {
      console.log("  Group By:", groupBy.key, "from", groupBy.tableName);
    } else {
      console.log("  No Group By");
    }

    // --- Validation ---
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

    if (!xAxis.key || !xAxis.tableName) {
      return res.status(400).json({
        success: false,
        error: "Invalid xAxis column or table name",
      });
    }

    for (const col of yAxes) {
      if (!col || !col.key || !col.tableName) {
        return res.status(400).json({
          success: false,
          error: `Invalid yAxis column: ${JSON.stringify(col)}`,
        });
      }
    }

    if (groupBy && (!groupBy.key || !groupBy.tableName)) {
      return res.status(400).json({
        success: false,
        error: "Invalid groupBy column or table name",
      });
    }

    const quoted = (col) => `\`${col}\``; // MySQL uses backticks for identifiers
    const needsJoin = secondaryTableName && joinColumn;

    const primaryTableAlias = "t1";
    const secondaryTableAlias = "t2";

    const selectParts = [];
    const groupByParts = [];

    const getQualifiedColumn = (columnObj) => {
      if (!columnObj || !columnObj.key) {
        throw new Error("Invalid column object");
      }
      if (needsJoin && columnObj.tableName === secondaryTableName) {
        return `${secondaryTableAlias}.${quoted(columnObj.key)}`;
      }
      return `${primaryTableAlias}.${quoted(columnObj.key)}`;
    };

    // X-axis
    selectParts.push(`${getQualifiedColumn(xAxis)} AS name`);
    groupByParts.push(getQualifiedColumn(xAxis));

    // Group by (if exists and not same as xAxis)
    if (groupBy && groupBy.key !== xAxis.key) {
      selectParts.push(
        `${getQualifiedColumn(groupBy)} AS ${quoted(groupBy.key)}`
      );
      groupByParts.push(getQualifiedColumn(groupBy));
    }

    // Y-axes with aggregation
    yAxes.forEach((col, idx) => {
      const agg = aggregationTypes[idx];
      selectParts.push(
        `CAST(${agg}(${getQualifiedColumn(col)}) AS SIGNED) AS ${quoted(col.key)}`
      );
    });

    // FROM + JOIN
    let query = `SELECT ${selectParts.join(", ")} FROM ${quoted(tableName)} AS ${primaryTableAlias}`;
    if (needsJoin) {
      query += ` INNER JOIN ${quoted(secondaryTableName)} AS ${secondaryTableAlias} ON ${primaryTableAlias}.${quoted(joinColumn)} = ${secondaryTableAlias}.${quoted(joinColumn)}`;
    }

    const queryParams = [];

    // WHERE clause (
    // WHERE clause (filters)
    if (filters.length > 0) {
      const whereParts = filters.map((filter, i) => {
        queryParams.push(filter.value);
        return `${primaryTableAlias}.${quoted(filter.column)} ${
          filter.operator
        } ?`;  // Using `?` as the placeholder for the filter value
      });
      query += ` WHERE ${whereParts.join(" AND ")}`;
    }

    // GROUP BY + ORDER BY
    query += ` GROUP BY ${groupByParts.join(", ")}`;
    query += ` ORDER BY ${groupByParts.join(", ")}`;

    console.log("Generated SQL Query:", query);

    // Execute the query and return the results
    const result = await _query(query, queryParams);

    res.json({
      success: true,
      data: result,
      query,
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
