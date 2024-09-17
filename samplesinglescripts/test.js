"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const exceljs_1 = __importDefault(require("exceljs"));
// Function to write debug data to a file
const writeDebugDataToFile = (fileName, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Create the 'errorlog' folder if it does not exist
        const errorLogFolderPath = path_1.default.join(__dirname, 'errorlog');
        yield promises_1.default.mkdir(errorLogFolderPath, { recursive: true });
        // Write the file to the 'errorlog' folder
        const filePath = path_1.default.join(errorLogFolderPath, fileName);
        yield promises_1.default.writeFile(filePath, data, 'utf-8');
    }
    catch (err) {
        console.error('Error writing debug data to file:', err instanceof Error ? err.message : err);
    }
});
// Set up PostgreSQL database connection
const pool = new pg_1.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'nokio',
    password: '123456',
    port: 5433,
});
const baseDirectoryPath = 'C:\\Users\\DeepthiK\\Downloads\\nokio\\batches'; // Update base directory path
const excelFilePath = path_1.default.join(__dirname, 'batches', 'batch_status.xlsx');
const imdbDirectoryPath = path_1.default.join(__dirname, 'batches');
// Function to get movie records from the database
const getMoviesFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield pool.query('SELECT * FROM movies');
        // Map the database rows to MovieRecord objects
        const movieRecords = result.rows.map((row) => ({
            Title: row.title,
            Year: parseInt(row.year, 10),
            Genre: row.genre,
            Director: row.director,
            Rating: parseFloat(row.rating),
            Actors: row.actor_ids,
            IMDB_ID: row.imdb_id,
            Poster_URL: row.poster_url,
        }));
        // Convert the movie records to a string (e.g., JSON format)
        const movieRecordsString = JSON.stringify(movieRecords, null, 2);
        // Write the movie records to a file
        const filePath = path_1.default.join(__dirname, 'db_result.txt');
        yield promises_1.default.writeFile(filePath, movieRecordsString, 'utf-8');
        // Return the movie records
        return movieRecords;
    }
    catch (err) {
        console.error('Error executing database query:', err instanceof Error ? err.message : err);
        return [];
    }
});
// Function to read batch status from Excel and filter "Not Processed" batches
const getNotProcessedBatches = (excelFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new exceljs_1.default.Workbook();
    try {
        yield workbook.xlsx.readFile(excelFilePath);
    }
    catch (err) {
        console.error('Error reading Excel file:', err instanceof Error ? err.message : err);
        return [];
    }
    // Access the "Movie Validation Status" sheet
    const worksheet = workbook.getWorksheet('Movie Validation Status');
    const notProcessedBatches = [];
    if (!worksheet) {
        console.error('Worksheet "Movie Validation Status" not found in the Excel file.');
        return notProcessedBatches;
    }
    worksheet.eachRow((row) => {
        var _a, _b;
        const batchName = ((_a = row.getCell(1).value) === null || _a === void 0 ? void 0 : _a.toString()) || "";
        const movieValidationStatus = (_b = row.getCell(2).value) === null || _b === void 0 ? void 0 : _b.toString(); // Updated to check the second column for status
        if (movieValidationStatus === 'Not Processed') {
            notProcessedBatches.push(batchName);
        }
    });
    return notProcessedBatches;
});
// Function to update batch status in Excel
const updateBatchStatusInExcel = (excelFilePath, batchName, status, reason = '') => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new exceljs_1.default.Workbook();
    try {
        yield workbook.xlsx.readFile(excelFilePath);
    }
    catch (err) {
        console.error('Error reading Excel file for update:', err instanceof Error ? err.message : err);
        return;
    }
    // Access the "Movie Validation Status" sheet
    const worksheet = workbook.getWorksheet('Movie Validation Status');
    if (!worksheet) {
        console.error('Worksheet "Movie Validation Status" not found in the Excel file.');
        return;
    }
    let found = false;
    worksheet.eachRow((row) => {
        var _a;
        if (((_a = row.getCell(1).value) === null || _a === void 0 ? void 0 : _a.toString()) === batchName) {
            row.getCell(2).value = status; // Update status in the second column
            row.getCell(3).value = reason; // Update reason for failure in the next column
            found = true;
        }
    });
    if (!found) {
        console.error(`Batch name ${batchName} not found in the worksheet.`);
        return;
    }
    try {
        yield workbook.xlsx.writeFile(excelFilePath);
    }
    catch (err) {
        console.error('Error writing to Excel file:', err instanceof Error ? err.message : err);
    }
});
// Function to load IMDb batch files
const loadIMDBBatchFiles = (directoryPath, batchFiles) => __awaiter(void 0, void 0, void 0, function* () {
    const imdbData = [];
    for (const batchFile of batchFiles) {
        const filePath = path_1.default.join(directoryPath, batchFile);
        try {
            const rawData = yield promises_1.default.readFile(filePath, 'utf-8');
            let batchData;
            try {
                batchData = JSON.parse(rawData);
            }
            catch (err) {
                if (err instanceof Error) {
                    console.error(`Error parsing JSON from file ${batchFile}: ${err.message}`);
                }
                else {
                    console.error(`Error parsing JSON from file ${batchFile}: ${String(err)}`);
                }
                continue; // Skip to the next file if JSON is invalid
            }
            console.log(`Loaded data from ${batchFile}:`, batchData);
            imdbData.push(...batchData);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(`Error reading file ${batchFile}: ${err.message}`);
            }
            else {
                console.error(`Error reading file ${batchFile}: ${String(err)}`);
            }
        }
    }
    return imdbData;
});
// Function to normalize movie records
const normalizeMovieRecord = (record) => {
    return {
        Title: (record.Title || record.title || "").trim(),
        Year: parseInt((record.Year || record.year || "0").toString(), 10),
        Genre: (record.Genre || record.genre || "").trim(),
        Director: (record.Director || record.director || "").trim(),
        Rating: parseFloat((record.Rating || record.rating || "0").toString()),
        Actors: (record.Actor_IDs || record.actor_ids || record.Actors || "").trim(),
        IMDB_ID: (record.IMDB_ID || record.imdb_id || "").trim().toLowerCase(), // Ensure IMDb IDs are in lowercase
        Poster_URL: (record.Poster_URL || record.poster_url || "").trim(),
    };
};
// Updated compareData function to log errors to the "log" directory
const compareData = (dbData, imdbData, batchName, excelFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = [];
    const imdbDataMap = new Map();
    for (const imdbMovieRaw of imdbData) {
        const imdbMovie = normalizeMovieRecord(imdbMovieRaw);
        imdbDataMap.set(imdbMovie.IMDB_ID, imdbMovie);
    }
    for (const dbMovieRaw of dbData) {
        const dbMovie = normalizeMovieRecord(dbMovieRaw);
        const imdbMovie = imdbDataMap.get(dbMovie.IMDB_ID);
        if (!imdbMovie) {
            errors.push(`Movie with IMDB_ID ${dbMovie.IMDB_ID} not found in any IMDb batch files.`);
        }
        else {
            for (const key of Object.keys(dbMovie)) {
                const dbValue = dbMovie[key];
                const imdbValue = imdbMovie[key];
                if (key === 'Actors') {
                    const dbActorList = (typeof dbValue === 'string' ? dbValue.split(',').map(id => id.trim()).sort() : []);
                    const imdbActorList = (typeof imdbValue === 'string' ? imdbValue.split(',').map(id => id.trim()).sort() : []);
                    if (JSON.stringify(dbActorList) !== JSON.stringify(imdbActorList)) {
                        errors.push(`Mismatch for movie ID ${dbMovie.IMDB_ID}: Field ${key} (DB: ${dbValue}, IMDb: ${imdbValue})`);
                    }
                }
                else if ((typeof dbValue === 'number' && typeof imdbValue === 'string' && dbValue !== parseFloat(imdbValue)) ||
                    (typeof dbValue === 'string' && typeof imdbValue === 'string' && dbValue.toLowerCase() !== imdbValue.toLowerCase())) {
                    errors.push(`Mismatch for movie ID ${dbMovie.IMDB_ID}: Field ${key} (DB: ${dbValue}, IMDb: ${imdbValue})`);
                }
            }
        }
    }
    const status = errors.length > 0 ? 'Comparison Failed' : 'Movie Comparison Finished';
    const errorReason = errors.join('; ');
    yield updateBatchStatusInExcel(excelFilePath, batchName, status, errorReason);
    if (errors.length > 0) {
        // Log errors to a JSON file in the "log" directory
        const logDirectory = path_1.default.join(__dirname, 'log');
        const errorFileName = 'error_batch.json';
        yield writeDebugDataToFile(`error_${batchName}.json`, JSON.stringify(errors, null, 2));
    }
});
// Function to chunk batches into groups for parallel processing
const batchChunks = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
// Main function to load data and perform comparison
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    // const excelFilePath = path.join(__dirname, 'batches', 'batch_status.xlsx');
    // const imdbDirectoryPath = path.join(__dirname, 'batches');
    const dbData = yield getMoviesFromDB();
    if (dbData.length === 0) {
        console.error('No data retrieved from the database.');
        return;
    }
    const notProcessedBatches = yield getNotProcessedBatches(excelFilePath);
    if (notProcessedBatches.length === 0) {
        console.log('All batches are already processed.');
        return;
    }
    const batchGroups = batchChunks(notProcessedBatches, 10); // Process 10 batches in parallel
    for (const group of batchGroups) {
        yield Promise.all(group.map((batchName) => __awaiter(void 0, void 0, void 0, function* () {
            const imdbBatchData = yield loadIMDBBatchFiles(imdbDirectoryPath, [batchName]);
            yield compareData(dbData, imdbBatchData, batchName, excelFilePath);
        })));
    }
    yield pool.end();
});
// Execute main function
main().catch(console.error);
