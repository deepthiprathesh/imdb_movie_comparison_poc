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
const path = __importStar(require("path"));
const ExcelJS = __importStar(require("exceljs"));
const inputJsonFilePath = 'large_imdb_mock_data.json';
const batchSize = 100;
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
    // Create two separate sheets: Actor Validation and Movie Comparison
    const actorSheet = workbook.addWorksheet('Actor Validation Status');
    const movieSheet = workbook.addWorksheet('Movie Comparison Status');
    // Add header rows for both sheets
    actorSheet.addRow(['Batch Name', 'Actor Validation Status']);
    movieSheet.addRow(['Batch Name', 'Movie Validation Status']);
    // Add rows for each batch with initial values as 'Not Processed'
    batches.forEach((_, index) => {
        const batchName = `batch_${index + 1}.json`;
        actorSheet.addRow([batchName, 'Not Processed']);
        movieSheet.addRow([batchName, 'Not Processed']);
    });
    // Save the Excel file
    const excelFilePath = path.join(folderName, 'batch_status.xlsx');
    yield workbook.xlsx.writeFile(excelFilePath);
    console.log(`Saved batch status to ${excelFilePath}`);
});
// Main function to process the file
const processFile = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Read JSON data from file
        const rawData = yield fs.readFile(inputJsonFilePath, 'utf-8');
        const data = JSON.parse(rawData);
        // Split data into batches
        const batches = splitIntoBatches(data, batchSize);
        // Create folder with current date-time stamp
        const currentDateTime = new Date().toISOString().replace(/[:.]/g, '-'); // Format: YYYY-MM-DDTHH-MM-SS
        const folderName = `batches_${currentDateTime}`;
        yield fs.mkdir(folderName);
        // Save each batch to a separate file
        yield Promise.all(batches.map((batch, index) => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = path.join(folderName, `batch_${index + 1}.json`);
            yield fs.writeFile(filePath, JSON.stringify(batch, null, 2));
            console.log(`Saved Batch ${index + 1} to ${filePath}`);
        })));
        // Write batch names and statuses to Excel
        yield writeBatchesToExcel(batches, folderName);
        console.log('All batches have been processed and saved.');
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
