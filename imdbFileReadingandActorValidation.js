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
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const path = __importStar(require("path"));
const ExcelJS = __importStar(require("exceljs"));
const csvParser = require('csv-parser'); // Use require for CSV parser
const inputJsonFilePath = path.join('testdata', 'large_imdb_mock_data.json');
const actorsCsvFilePath = path.join('testdata', 'actors_data.csv');
const batchFolderPath = './batches';
const batchSize = 100;
// Function to create or clear the batches folder
const initializeBatchFolder = (folderPath) => __awaiter(void 0, void 0, void 0, function* () {
    if (fsSync.existsSync(folderPath)) {
        // Clear existing files in the folder
        const files = yield fs.readdir(folderPath);
        yield Promise.all(files.map(file => fs.unlink(path.join(folderPath, file))));
    }
    else {
        yield fs.mkdir(folderPath);
    }
    console.log(`Initialized folder: ${folderPath}`);
});
// Function to split data into batches
const splitIntoBatches = (data, batchSize) => {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }
    return batches;
};
// Function to write batch names and statuses to Excel
const writeBatchesToExcel = (batches, folderName) => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new ExcelJS.Workbook();
    const actorSheet = workbook.addWorksheet('Batch Status');
    const movieSheet = workbook.addWorksheet('Movie Validation Status');
    // Add headers
    actorSheet.addRow(['Batch Name', 'Actor Validation Status', 'Failure Reason']);
    movieSheet.addRow(['Batch Name', 'Movie Validation Status']);
    // Add rows for each batch with initial values as 'Not Processed'
    batches.forEach((_, index) => {
        const batchName = `batch_${index + 1}.json`;
        actorSheet.addRow([batchName, 'Not Processed', '']);
        movieSheet.addRow([batchName, 'Not Processed']);
    });
    // Save the Excel file
    const excelFilePath = path.join(folderName, 'batch_status.xlsx');
    yield workbook.xlsx.writeFile(excelFilePath);
    console.log(`Saved batch status to ${excelFilePath}`);
});
// Function to read and parse the actors CSV file
const readActorsCSV = (actorsCsvFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    const actorsMap = new Map();
    yield new Promise((resolve, reject) => {
        fsSync.createReadStream(actorsCsvFilePath)
            .pipe(csvParser())
            .on('data', (row) => {
            actorsMap.set(row.Actor_ID, row.Actor_Name);
        })
            .on('end', resolve)
            .on('error', reject);
    });
    console.log('Actors CSV file has been read successfully.');
    return actorsMap;
});
// Function to validate batch files
const validateBatches = (folderName, actorsMap) => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new ExcelJS.Workbook();
    const excelFilePath = path.join(folderName, 'batch_status.xlsx');
    yield workbook.xlsx.readFile(excelFilePath);
    const actorSheet = workbook.getWorksheet('Batch Status');
    const movieSheet = workbook.getWorksheet('Movie Validation Status');
    if (!actorSheet || !movieSheet) {
        console.error('Required worksheets not found in the Excel file.');
        return;
    }
    const batchStatusMap = new Map();
    const notProcessedBatches = [];
    actorSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
            const batchName = row.getCell(1).value;
            const actorValidationStatus = row.getCell(2).value;
            batchStatusMap.set(batchName, row);
            if (actorValidationStatus === 'Not Processed') {
                notProcessedBatches.push(batchName);
            }
        }
    });
    // const validateBatch = async (file: string) => {
    //   const filePath = path.join(folderName, file);
    //   const rawData = await fs.readFile(filePath, 'utf-8');
    //   const data: MovieRecord[] = JSON.parse(rawData);
    //   let allActorsValid = true;
    //   let failureReasons: string[] = [];
    //   data.forEach((movie: MovieRecord) => {
    //     const actorIds = movie.Actor_IDs.split(', ');
    //     actorIds.forEach((actorId: string) => {
    //       if (!actorsMap.has(actorId)) {
    //         const reason = `Actor ID "${actorId}" not found in "actors_data.csv" for the movie titled "${movie.Title}".`;
    //         console.error(reason);
    //         failureReasons.push(reason);
    //         allActorsValid = false;
    //       }
    //     });
    //   });
    //   const actorRow = batchStatusMap.get(file);
    //   if (actorRow) {
    //     if (allActorsValid) {
    //       actorRow.getCell(2).value = 'Actor Validation Processed';
    //       actorRow.getCell(2).font = { color: { argb: 'FF00FF00' } }; // Green for success
    //       console.log(`Actor validation passed for batch file "${file}". Movie validation status remains 'Not Processed'.`);
    //     } else {
    //       actorRow.getCell(2).value = 'Error';
    //       actorRow.getCell(2).font = { color: { argb: 'FFFF0000' } }; // Red for error
    //       actorRow.getCell(3).value = failureReasons.join('; '); // Write failure reasons to the next column
    //       console.error(`Actor validation failed for batch file "${file}". Reasons: ${failureReasons.join('; ')}`);
    //     }
    //   } else {
    //     console.error(`Batch file "${file}" not found in the Excel status sheet.`);
    //   }
    //   await workbook.xlsx.writeFile(excelFilePath);
    // };
    const validateBatch = (file) => __awaiter(void 0, void 0, void 0, function* () {
        const filePath = path.join(folderName, file);
        const rawData = yield fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(rawData);
        let allActorsValid = true;
        const errorMessages = []; // Array to accumulate specific error messages
        data.forEach((movie) => {
            const actorIds = movie.Actor_IDs.split(', ');
            actorIds.forEach((actorId) => {
                if (!actorsMap.has(actorId)) {
                    const errorMessage = `Error: Actor ID "${actorId}" not found in "actors_data.csv" for the movie titled "${movie.Title}".`;
                    errorMessages.push(errorMessage);
                    allActorsValid = false;
                }
            });
        });
        const actorRow = batchStatusMap.get(file);
        if (actorRow) {
            if (allActorsValid) {
                actorRow.getCell(2).value = 'Actor Validation Processed';
                actorRow.getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF00FF00' }, // Green background
                };
                console.log(`Actor validation passed for batch file "${file}". Movie validation status remains 'Not Processed'.`);
            }
            else {
                actorRow.getCell(2).value = 'Actor not found';
                actorRow.getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }, // Red background
                };
                // Write the exact errors for each mismatched actor in the next column
                actorRow.getCell(3).value = errorMessages.join('\n');
                console.error(`Actor validation failed for batch file "${file}". Errors: ${errorMessages.join('; ')}`);
            }
        }
        else {
            console.error(`Batch file "${file}" not found in the Excel status sheet.`);
        }
        yield workbook.xlsx.writeFile(excelFilePath);
    });
    const processBatchesInChunks = (files, chunkSize) => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            console.log(`Processing batches in parallel: ${chunk.join(', ')}`);
            yield Promise.all(chunk.map(file => validateBatch(file)));
            console.log(`Completed processing of batches: ${chunk.join(', ')}`);
        }
    });
    yield processBatchesInChunks(notProcessedBatches, 10); // Process in chunks of 10
    console.log('All batches have been processed.');
});
// Main function to process the file
const processFile = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Initialize the batches folder
        yield initializeBatchFolder(batchFolderPath);
        // Read JSON data from file
        const rawData = yield fs.readFile(inputJsonFilePath, 'utf-8');
        const data = JSON.parse(rawData);
        // Split data into batches
        const batches = splitIntoBatches(data, batchSize);
        // Save each batch to a separate file
        yield Promise.all(batches.map((batch, index) => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = path.join(batchFolderPath, `batch_${index + 1}.json`);
            yield fs.writeFile(filePath, JSON.stringify(batch, null, 2));
            console.log(`Saved Batch ${index + 1} to ${filePath}`);
        })));
        // Write batch names and statuses to Excel
        yield writeBatchesToExcel(batches, batchFolderPath);
        // Read and parse the actors CSV file
        const actorsMap = yield readActorsCSV(actorsCsvFilePath);
        // Validate batches
        yield validateBatches(batchFolderPath, actorsMap);
        console.log('All batches have been processed and validated.');
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('An error occurred:', err.message);
        }
        else {
            console.error('An unknown error occurred:', err);
        }
    }
});
// Call the main function
processFile();
