import { Router } from "express";
import { _query } from "../database/connection.js";  // MySQL2 connection
const router = Router();

// POST /analytics/aggregate
router.post("/aggregate", async (req, res) => {
  try {
    const {
      tableName,             // Primary table
      xAxis,                 // { key: string, tableName: string }
      yAxes,                 // Array<{ key: string, tableName: string }>
      groupBy,               // Optional { key: string, tableName: string }
      aggregationTypes,      // Array of aggregation names like 'SUM', 'COUNT'
      filters = [],          // Optional filters
      secondaryTableNames = [],   // ✅ multiple tables now
      joinColumns = {},           // ✅ map { tableName -> joinColumnKey }
    } = req.body;

    // --- Validation ---
    if (
      !tableName ||
      !xAxis ||
      !yAxes ||
      yAxes.length === 0 ||
      !aggregationTypes ||
      aggregationTypes.length !== yAxes.length
    ) {
      return res.status(400).json({ success: false, error: "Missing or invalid parameters" });
    }

    if (!xAxis.key || !xAxis.tableName) {
      return res.status(400).json({ success: false, error: "Invalid xAxis column" });
    }

    for (const col of yAxes) {
      if (!col || !col.key || !col.tableName) {
        return res.status(400).json({ success: false, error: `Invalid yAxis column: ${JSON.stringify(col)}` });
      }
    }

    if (groupBy && (!groupBy.key || !groupBy.tableName)) {
      return res.status(400).json({ success: false, error: "Invalid groupBy column" });
    }

    // Helpers
    const quoted = (col) => `\`${col}\``;
    const primaryAlias = "t1";
    let aliasCounter = 2;
    const tableAliases = {}; // { secTable -> alias }
    secondaryTableNames.forEach((t) => {
      tableAliases[t] = `t${aliasCounter++}`;
    });

    const getQualifiedColumn = (col) => {
      if (!col || !col.key || !col.tableName) {
        throw new Error("Invalid column object");
      }
      if (col.tableName === tableName) return `${primaryAlias}.${quoted(col.key)}`;
      const alias = tableAliases[col.tableName];
      return `${alias}.${quoted(col.key)}`;
    };

    // --- SELECT construction ---
    const selectParts = [];
    const groupByParts = [];

    // X-axis
    selectParts.push(`${getQualifiedColumn(xAxis)} AS name`);
    groupByParts.push(getQualifiedColumn(xAxis));

    // Group By
    if (groupBy && groupBy.key !== xAxis.key) {
      selectParts.push(`${getQualifiedColumn(groupBy)} AS ${quoted(groupBy.key)}`);
      groupByParts.push(getQualifiedColumn(groupBy));
    }

    // Y-Axes with aggregation
    yAxes.forEach((col, idx) => {
      const agg = aggregationTypes[idx].toUpperCase();
      const allowedAggs = ["SUM", "COUNT", "AVG", "MIN", "MAX"];
      if (!allowedAggs.includes(agg)) {
        throw new Error(`Invalid aggregation: ${agg}`);
      }
      selectParts.push(`${agg}(${getQualifiedColumn(col)}) AS ${quoted(col.key)}`);
    });

    // --- FROM + JOIN ---
    let query = `SELECT ${selectParts.join(", ")} FROM ${quoted(tableName)} AS ${primaryAlias}`;

    secondaryTableNames.forEach((t) => {
      const alias = tableAliases[t];
      const joinCol = joinColumns[t];
      if (joinCol) {
        query += ` INNER JOIN ${quoted(t)} AS ${alias} ON ${primaryAlias}.${quoted(joinCol)} = ${alias}.${quoted(joinCol)}`;
      }
    });

    const queryParams = [];

    // --- Filters ---
    if (filters.length > 0) {
      const whereParts = filters.map((filter) => {
        queryParams.push(filter.value);
        return `${getQualifiedColumn(filter)} ${filter.operator} ?`;
      });
      query += ` WHERE ${whereParts.join(" AND ")}`;
    }

    // --- GROUP BY / ORDER BY ---
    if (groupByParts.length > 0) {
      query += ` GROUP BY ${groupByParts.join(", ")} ORDER BY ${groupByParts.join(", ")}`;
    }

    console.log("Generated SQL Query:", query);

    // --- Execute ---
    const result = await _query(query, queryParams);
    res.json({ success: true, data: result, query });
  } catch (error) {
    console.error("Error in /aggregate:", error);
    res.status(500).json({ success: false, error: "Failed to aggregate data: " + error.message });
  }
});

export default router;