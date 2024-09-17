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
// Update these paths to match your new directory
const baseDirectoryPath = 'C:\\Users\\DeepthiK\\Downloads\\nokio\\batches'; // Update base directory path
const excelFilePath = path_1.default.join(baseDirectoryPath, 'batch_status.xlsx'); // Excel file location
const imdbDirectoryPath = baseDirectoryPath; // IMDb batch files directory
// Function to get movie records from the database
const getMoviesFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield pool.query('SELECT * FROM movies');
        return result.rows.map((row) => ({
            Title: row.title,
            Year: parseInt(row.year, 10),
            Genre: row.genre,
            Director: row.director,
            Rating: parseFloat(row.rating),
            Actors: row.actor_ids,
            IMDB_ID: row.imdb_id,
            Poster_URL: row.poster_url,
        }));
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
    const worksheet = workbook.getWorksheet('Batch Status');
    const notProcessedBatches = [];
    if (!worksheet) {
        console.error('Worksheet "Batch Status" not found in the Excel file.');
        return notProcessedBatches;
    }
    worksheet.eachRow((row) => {
        var _a, _b;
        const batchName = ((_a = row.getCell(1).value) === null || _a === void 0 ? void 0 : _a.toString()) || "";
        const movieValidationStatus = (_b = row.getCell(3).value) === null || _b === void 0 ? void 0 : _b.toString();
        if (movieValidationStatus === 'Not Processed') {
            notProcessedBatches.push(batchName);
        }
    });
    return notProcessedBatches;
});
// Function to update batch status in Excel
const updateBatchStatusInExcel = (excelFilePath, batchName, status) => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new exceljs_1.default.Workbook();
    try {
        yield workbook.xlsx.readFile(excelFilePath);
    }
    catch (err) {
        console.error('Error reading Excel file for update:', err instanceof Error ? err.message : err);
        return;
    }
    const worksheet = workbook.getWorksheet('Batch Status');
    if (!worksheet) {
        console.error('Worksheet "Batch Status" not found in the Excel file.');
        return;
    }
    worksheet.eachRow((row) => {
        if (row.getCell(1).value === batchName) {
            row.getCell(3).value = status;
        }
    });
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
            const batchData = JSON.parse(rawData);
            imdbData.push(...batchData);
        }
        catch (err) {
            console.error(`Error reading or parsing file ${batchFile}:`, err instanceof Error ? err.message : err);
        }
    }
    return imdbData;
});
// Function to normalize movie records
const normalizeMovieRecord = (record) => {
    return {
        Title: record.Title || record.title || "",
        Year: parseInt(record.Year || record.year || "0", 10),
        Genre: record.Genre || record.genre || "",
        Director: record.Director || record.director || "",
        Rating: parseFloat(record.Rating || record.rating || "0"),
        Actors: (record.Actor_IDs || record.actor_ids || record.Actors || "").trim(),
        IMDB_ID: (record.IMDB_ID || record.imdb_id || "").trim(),
        Poster_URL: (record.Poster_URL || record.poster_url || "").trim(),
    };
};
// Function to compare data between DB and IMDb batches
const compareData = (dbData, imdbData, batchName, excelFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = [];
    for (const dbMovieRaw of dbData) {
        const dbMovie = normalizeMovieRecord(dbMovieRaw);
        let match;
        for (const imdbMovieRaw of imdbData) {
            const imdbMovie = normalizeMovieRecord(imdbMovieRaw);
            if (imdbMovie.IMDB_ID === dbMovie.IMDB_ID) {
                match = imdbMovie;
                break;
            }
        }
        if (!match) {
            errors.push(`Movie with IMDB_ID ${dbMovie.IMDB_ID} not found in IMDb batch files.`);
        }
        else {
            for (const key of Object.keys(dbMovie)) {
                const dbValue = dbMovie[key];
                const imdbValue = match[key];
                if (key === 'Actors') {
                    const dbActorList = (typeof dbValue === 'string' ? dbValue.split(',').map(id => id.trim()).sort() : []);
                    const imdbActorList = (typeof imdbValue === 'string' ? imdbValue.split(',').map(id => id.trim()).sort() : []);
                    if (JSON.stringify(dbActorList) !== JSON.stringify(imdbActorList)) {
                        errors.push(`Mismatch for movie ID ${dbMovie.IMDB_ID}: Field ${key} (DB: ${dbValue}, IMDb: ${imdbValue})`);
                    }
                }
                else if ((typeof dbValue === 'number' && typeof imdbValue === 'string' && dbValue !== parseFloat(imdbValue)) ||
                    (typeof dbValue === 'string' && dbValue !== imdbValue)) {
                    errors.push(`Mismatch for movie ID ${dbMovie.IMDB_ID}: Field ${key} (DB: ${dbValue}, IMDb: ${imdbValue})`);
                }
            }
        }
    }
    if (errors.length > 0) {
        console.error('Data mismatches found:', errors);
        yield writeDebugDataToFile(`${batchName}_errors.txt`, errors.join('\n'));
    }
    else {
        console.log(`Movie comparison finished for batch: ${batchName}`);
    }
    yield updateBatchStatusInExcel(excelFilePath, batchName, 'Movie Comparison Finished');
});
// Main function to load data and perform comparison
// Main function to load data and perform comparison
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notProcessedBatches = yield getNotProcessedBatches(excelFilePath);
        const chunkedBatches = batchChunks(notProcessedBatches, 10);
        for (const chunk of chunkedBatches) {
            yield Promise.all(chunk.map((batchFile) => __awaiter(void 0, void 0, void 0, function* () {
                const imdbData = yield loadIMDBBatchFiles(imdbDirectoryPath, [batchFile]);
                const dbData = yield getMoviesFromDB();
                yield compareData(dbData, imdbData, batchFile, excelFilePath);
            })));
        }
    }
    catch (err) {
        console.error('Error in main function:', err instanceof Error ? err.message : err);
    }
    finally {
        yield pool.end();
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
// Run the main function
main();
