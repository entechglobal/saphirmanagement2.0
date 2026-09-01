import { Parser } from "json2csv";
import ExcelJS from "exceljs";
import csvParser from "csv-parser";
import stream from "stream";
import ApiError from "./apiError.js";

/* ============================================================
   EXPORT TO CSV
   @param {object[]} records  — already-mapped plain objects
   @param {string[]} fields   — column names in order
   @returns {string}
============================================================ */
export const exportCSV = (records, fields) => {
  const parser = new Parser({ fields, quote: "" });
  return parser.parse(records);
};

/* ============================================================
   EXPORT TO EXCEL
   @param {object[]} records  — already-mapped plain objects
   @param {object}   config
     - worksheetName {string}
     - columns       {Array<{header, key, width}>}
     - numFmts       {Object<key, format>}  optional
   @returns {ExcelJS.Workbook}
============================================================ */
export const exportExcel = (records, config) => {
  const { worksheetName, columns, numFmts = {} } = config;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);

  worksheet.columns = columns;
  worksheet.addRows(records);

  // Apply column number formats
  for (const [key, fmt] of Object.entries(numFmts)) {
    worksheet.getColumn(key).numFmt = fmt;
  }

  // Bold header row + freeze
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook;
};

/* ============================================================
   IMPORT FROM CSV
   @param {Buffer}   buffer    — uploaded file buffer
   @param {Function} rowMapper — (row) => parsedRecord | throws ApiError
   @param {Function} saveFn   — (record) => Promise<any>  (prisma upsert)
   @returns {Promise<number>}  count of upserted records
============================================================ */
export const importCSV = (buffer, rowMapper, saveFn) => {
  const rows = [];

  return new Promise((resolve, reject) => {
    const readable = new stream.Readable();
    readable.push(buffer);
    readable.push(null);

    readable
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        try {
          const records = [];
          for (const row of rows) {
            const record = await rowMapper(row);
            if (record != null) records.push(record);
          }
          const results = await Promise.all(records.map(saveFn));
          resolve(results.length);
        } catch (err) {
          if (err instanceof ApiError) return reject(err);
          if (err.code === "P2002")
            return reject(new ApiError("Duplicate key violation", 409));
          reject(new ApiError(err.message || "Import failed", 400));
        }
      })
      .on("error", () => reject(new ApiError("CSV parsing error", 400)));
  });
};

/* ============================================================
   IMPORT FROM EXCEL
   @param {Buffer}   buffer        — uploaded file buffer
   @param {string}   worksheetName — expected sheet name
   @param {Function} rowMapper     — (row, rowNumber) => parsedRecord | null to skip | throws ApiError
   @param {Function} saveFn        — (record) => Promise<any>  (prisma upsert)
   @returns {Promise<number>}  count of upserted records
============================================================ */
export const importExcel = async (buffer, worksheetName, rowMapper, saveFn) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(worksheetName);
    if (!worksheet) {
      throw new ApiError(`Worksheet '${worksheetName}' not found`, 400);
    }

    const records = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      try {
        const record = await rowMapper(row, rowNumber);
        if (record !== null && record !== undefined) records.push(record);
      } catch (err) {
        throw err instanceof ApiError
          ? err
          : new ApiError(`Error at row ${rowNumber}`, 400);
      }
    }

    if (records.length === 0) throw new ApiError("File contains no data", 400);

    const results = await Promise.all(records.map(saveFn));
    return results.length;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.message?.includes("End of data"))
      throw new ApiError("Invalid or corrupted Excel file", 400);
    if (err.code === "P2002")
      throw new ApiError("Duplicate key violation", 409);
    throw new ApiError("Failed to import Excel file", 500);
  }
};
