import { Router } from "express";
const router = Router();
import pool from "../database/connection.js";
const _query = pool.query.bind(pool);

// POST /analytics/aggregate
router.post("/aggregate", async (req, res) => {
  try {
    const {
      tableName, // Primary table
      xAxis, // Expected to be { key: string, tableName: string }
      yAxes, // Expected to be Array<{ key: string, tableName: string }>
      groupBy, // Expected to be { key: string, tableName: string } | undefined
      aggregationTypes,
      filters = [],
      secondaryTableName, // Secondary table for joins
      joinColumn, // Common column for joining
    } = req.body;

    // --- Start Debug Logging ---
    console.log("Received Aggregation Request:");
    console.log("  Primary Table (frontend selected):", tableName);
    console.log(
      "  Secondary Table (frontend selected, if any):",
      secondaryTableName
    );
    console.log("  Join Column (frontend identified, if any):", joinColumn);
    console.log("--- Column Details from Request (for qualification) ---");
    console.log(
      "  X-Axis Column:",
      xAxis ? xAxis.key : "N/A",
      "from table:",
      xAxis ? xAxis.tableName : "N/A"
    );
    yAxes.forEach((col, index) => {
      console.log(
        `  Y-Axis Column ${index + 1}:`,
        col ? col.key : "N/A",
        "from table:",
        col ? col.tableName : "N/A"
      );
    });
    if (groupBy) {
      console.log(
        "  Group By Column:",
        groupBy.key,
        "from table:",
        groupBy.tableName
      );
    } else {
      console.log("  No Group By Column.");
    }
    console.log("-------------------------------------------------");
    // --- End Debug Logging ---

    // Basic validation
    if (
      !tableName ||
      !xAxis || // This checks if xAxis itself is null/undefined
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

    // Enhanced validation for column objects: ensure key and tableName are present
    if (!xAxis.key || !xAxis.tableName) {
      return res.status(400).json({
        success: false,
        error: "X-Axis column (key or table name) is missing or invalid.",
      });
    }
    for (const col of yAxes) {
      if (!col || !col.key || !col.tableName) {
        return res.status(400).json({
          success: false,
          error: `Y-Axis column '${
            col ? col.key : "unknown"
          }' (key or table name) is missing or invalid.`,
        });
      }
    }
    if (groupBy && (!groupBy.key || !groupBy.tableName)) {
      return res.status(400).json({
        success: false,
        error: "Group By column (key or table name) is missing or invalid.",
      });
    }

    const quoted = (col) => `"${col}"`;

    const needsJoin = secondaryTableName && joinColumn;

    const primaryTableAlias = "t1";
    const secondaryTableAlias = "t2";

    const selectParts = [];
    const groupByParts = [];

    // Helper to get qualified column name based on its originating table
    const getQualifiedColumn = (columnObj) => {
      // This check should ideally be redundant due to the validation above,
      // but serves as a final safeguard.
      if (!columnObj || !columnObj.key) {
        console.error(
          "Attempted to qualify an invalid column object:",
          columnObj
        );
        throw new Error(
          "Invalid column key provided for SQL query generation."
        );
      }
      // If a join is needed and the column belongs to the secondary table
      if (needsJoin && columnObj.tableName === secondaryTableName) {
        return `${secondaryTableAlias}.${quoted(columnObj.key)}`;
      }
      // Otherwise, assume it belongs to the primary table
      return `${primaryTableAlias}.${quoted(columnObj.key)}`;
    };

    // Add X-axis to SELECT and GROUP BY
    selectParts.push(`${getQualifiedColumn(xAxis)} AS name`);
    groupByParts.push(getQualifiedColumn(xAxis));

    // Add Group By column if present and different from X-axis
    if (groupBy && groupBy.key !== xAxis.key) {
      selectParts.push(`${getQualifiedColumn(groupBy)} AS group_by`);
      groupByParts.push(getQualifiedColumn(groupBy));
    }

    // Add Y-axes with aggregation
    yAxes.forEach((col, idx) => {
      const agg = aggregationTypes[idx];
      selectParts.push(
        `${agg}(${getQualifiedColumn(col)}) AS ${quoted(col.key)}`
      );
    });

    // Construct FROM and JOIN clauses
    let query = `SELECT ${selectParts.join(", ")} FROM ${quoted(
      tableName
    )} AS ${primaryTableAlias}`;

    if (needsJoin) {
      query += ` INNER JOIN ${quoted(
        secondaryTableName
      )} AS ${secondaryTableAlias} ON ${primaryTableAlias}.${quoted(
        joinColumn
      )} = ${secondaryTableAlias}.${quoted(joinColumn)}`;
    }

    const queryParams = [];

    // WHERE clause (filters)
    // Assuming filter columns are from the primary table for simplicity.
    // If filters can apply to secondary table columns, this logic would need to be extended
    // to include `tableName` in filter objects and use `getQualifiedColumn`.
    if (filters.length > 0) {
      const whereParts = filters.map((filter, i) => {
        queryParams.push(filter.value);
        // This is a simplification. For full robustness, filter.column should also carry its tableName.
        return `${primaryTableAlias}.${quoted(filter.column)} ${
          filter.operator
        } $${queryParams.length}`;
      });
      query += ` WHERE ${whereParts.join(" AND ")}`;
    }

    // GROUP BY and ORDER BY
    query += ` GROUP BY ${groupByParts.join(", ")}`;
    query += ` ORDER BY ${groupByParts.join(", ")}`;

    // --- Final Query Debug Log ---
    console.log("Generated SQL Query (before execution):", query);
    // --- End Final Query Debug Log ---

    const result = await _query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      query, // Return the generated query for frontend display
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
