"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ExcelJS = __importStar(require("exceljs"));
const csvParser = require('csv-parser'); // Changed import to use require
// Paths to input files
const actorsCsvFilePath = 'actors_data.csv';
const batchFolderPath = './batches_2024-09-05T10-17-31-142Z'; // Replace with your actual folder name
const excelFilePath = path.join(batchFolderPath, 'batch_status.xlsx');
// Function to create Excel file with initial columns if it does not exist
function createExcelFileIfNotExists(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs.existsSync(filePath)) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Batch Status');
            // Add headers
            worksheet.addRow(['Batch Name', 'Actor Validation Status', 'Movie Validation Status']);
            // Dynamically read all JSON files from the directory
            const files = fs.readdirSync(batchFolderPath).filter(file => file.endsWith('.json'));
            // Add each JSON file as a new row in the Excel sheet with "Not Processed" status
            files.forEach(batchName => {
                worksheet.addRow([batchName, 'Not Processed', 'Not Processed']);
            });
            // Save the workbook
            yield workbook.xlsx.writeFile(filePath);
            console.log(`Excel file created at: ${filePath}`);
        }
    });
}
// Wrap the script in an async function
(() => __awaiter(void 0, void 0, void 0, function* () {
    // Create the Excel file if it does not exist
    yield createExcelFileIfNotExists(excelFilePath);
    // Read and parse the actors CSV file
    const actorsMap = new Map();
    fs.createReadStream(actorsCsvFilePath)
        .pipe(csvParser())
        .on('data', (row) => {
        actorsMap.set(row.Actor_ID, row.Actor_Name);
    })
        .on('end', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Actors CSV file has been read successfully.');
        // Read the Excel file to get batch names and statuses
        const workbook = new ExcelJS.Workbook();
        yield workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet('Batch Status');
        if (!worksheet) {
            console.error('Worksheet "Batch Status" not found in the Excel file.');
            return;
        }
        // Create a map of batch names to rows for easy lookup
        const batchStatusMap = new Map();
        const notProcessedBatches = [];
        // Initialize all cells with "Not Processed" status for each batch
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                row.getCell(2).value = row.getCell(2).value || 'Not Processed'; // Actor Validation Status
                row.getCell(3).value = row.getCell(3).value || 'Not Processed'; // Movie Validation Status
                const batchName = row.getCell(1).value;
                const actorValidationStatus = row.getCell(2).value; // Use "Actor Validation Status" for "Not Processed" batches
                batchStatusMap.set(batchName, row);
                if (actorValidationStatus === 'Not Processed') {
                    notProcessedBatches.push(batchName);
                }
            }
        });
        // Function to validate a single batch file
        const validateBatch = (file) => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = path.join(batchFolderPath, file);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);
            let allActorsValid = true;
            // Validate Actor IDs for each movie record
            data.forEach((movie) => {
                const actorIds = movie.Actor_IDs.split(', ');
                actorIds.forEach((actorId) => {
                    if (!actorsMap.has(actorId)) {
                        // Log error if Actor ID is not found
                        console.error(`Error: Actor ID "${actorId}" not found in "actors_data.csv" for the movie titled "${movie.Title}" in batch file "${file}".`);
                        allActorsValid = false;
                    }
                });
            });
            // Update status in Excel
            const row = batchStatusMap.get(file);
            if (row) {
                row.getCell(2).value = allActorsValid ? 'Actor Validation Processed' : 'Error'; // Update "Actor Validation Status"
            }
            else {
                console.error(`Batch file "${file}" not found in the Excel status sheet.`);
            }
            // Save the updated Excel file
            yield workbook.xlsx.writeFile(excelFilePath);
        });
        // Function to process a single batch and mark as "Processed"
        const processBatch = (file) => __awaiter(void 0, void 0, void 0, function* () {
            const row = batchStatusMap.get(file);
            if (row) {
                row.getCell(2).value = 'Processed'; // Mark as "Processed" once considered for validation
            }
            yield validateBatch(file);
        });
        // Process batches in parallel with a limit of 10
        const processBatchesInChunks = (files, chunkSize) => __awaiter(void 0, void 0, void 0, function* () {
            for (let i = 0; i < files.length; i += chunkSize) {
                const chunk = files.slice(i, i + chunkSize);
                console.log(`Processing batches in parallel: ${chunk.join(', ')}`);
                yield Promise.all(chunk.map(file => processBatch(file)));
                console.log(`Completed processing of batches: ${chunk.join(', ')}`);
            }
        });
        yield processBatchesInChunks(notProcessedBatches, 10); // Process 10 batches in parallel
        console.log('All batches have been processed.');
    }));
}))();
