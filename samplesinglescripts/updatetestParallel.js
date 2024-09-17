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
const p_limit_1 = __importDefault(require("p-limit"));
// Function to write debug data to a file
const writeDebugDataToFile = (fileName, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errorLogFolderPath = path_1.default.join(__dirname, 'errorlog');
        yield promises_1.default.mkdir(errorLogFolderPath, { recursive: true });
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
const baseDirectoryPath = path_1.default.join('C:', 'Users', 'DeepthiK', 'Downloads', 'nokio', 'batches');
const excelFilePath = path_1.default.join(baseDirectoryPath, 'batch_status.xlsx');
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
        console.log(`Reading Excel file at: ${excelFilePath}`); // Debugging path
        yield workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet('Movie Validation Status');
        if (!worksheet)
            throw new Error('Worksheet "Movie Validation Status" not found.');
        return worksheet.getColumn(2).values
            .slice(1)
            .map((status, index) => { var _a; return (status === 'Not Processed' ? (_a = worksheet.getCell(index + 1, 1).value) === null || _a === void 0 ? void 0 : _a.toString() : null); })
            .filter(batchName => batchName !== null);
    }
    catch (err) {
        console.error('Error reading Excel file:', err instanceof Error ? err.message : err);
        return [];
    }
});
// Function to update batch status in Excel
const updateBatchStatusInExcel = (excelFilePath, batchName, status, reason = '', foundDetails = '') => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new exceljs_1.default.Workbook();
    try {
        console.log(`Updating Excel file at: ${excelFilePath} for batch: ${batchName}`); // Debugging
        yield workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet('Movie Validation Status');
        if (!worksheet)
            throw new Error('Worksheet "Movie Validation Status" not found.');
        let found = false;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            var _a;
            if (((_a = row.getCell(1).value) === null || _a === void 0 ? void 0 : _a.toString()) === batchName) {
                row.getCell(2).value = status;
                row.getCell(3).value = reason;
                row.getCell(4).value = foundDetails; // Write movie details found to the next column
                found = true;
            }
        });
        if (!found)
            throw new Error(`Batch name ${batchName} not found in the worksheet.`);
        yield workbook.xlsx.writeFile(excelFilePath);
    }
    catch (err) {
        console.error('Error writing to Excel file:', err instanceof Error ? err.message : err);
    }
});
// Function to load IMDb batch files
const loadIMDBBatchFiles = (directoryPath) => __awaiter(void 0, void 0, void 0, function* () {
    const imdbData = [];
    try {
        console.log(`Reading IMDb batch files from directory: ${directoryPath}`); // Debugging
        const batchFiles = yield promises_1.default.readdir(directoryPath);
        for (const batchFile of batchFiles) {
            const filePath = path_1.default.join(directoryPath, batchFile);
            const stat = yield promises_1.default.stat(filePath);
            if (stat.isFile() && path_1.default.extname(batchFile).toLowerCase() === '.json') {
                try {
                    const rawData = yield promises_1.default.readFile(filePath, 'utf-8');
                    let batchData;
                    try {
                        batchData = JSON.parse(rawData);
                        imdbData.push(...batchData);
                    }
                    catch (err) {
                        console.error(`Error parsing JSON from file ${filePath}:`, err instanceof Error ? err.message : err);
                    }
                }
                catch (err) {
                    console.error(`Error reading file ${filePath}:`, err instanceof Error ? err.message : err);
                }
            }
        }
    }
    catch (err) {
        console.error(`Error reading directory ${directoryPath}:`, err instanceof Error ? err.message : err);
    }
    return imdbData;
});
// Function to normalize movie records
const normalizeMovieRecord = (record) => ({
    Title: (record.Title || record.title || "").trim(),
    Year: parseInt((record.Year || record.year || "0").toString(), 10),
    Genre: (record.Genre || record.genre || "").trim(),
    Director: (record.Director || record.director || "").trim(),
    Rating: parseFloat((record.Rating || record.rating || "0").toString()),
    Actors: (record.Actor_IDs || record.actor_ids || record.Actors || "").trim(),
    IMDB_ID: (record.IMDB_ID || record.imdb_id || "").trim().toLowerCase(),
    Poster_URL: (record.Poster_URL || record.poster_url || "").trim(),
});
const compareDataSequentially = (dbData, excelFilePath, baseDirectoryPath, limit) => __awaiter(void 0, void 0, void 0, function* () {
    const notProcessedBatches = yield getNotProcessedBatches(excelFilePath);
    if (notProcessedBatches.length === 0) {
        console.log('No "Not Processed" batches found.');
        return;
    }
    const tasks = notProcessedBatches.map(batchName => limit(() => __awaiter(void 0, void 0, void 0, function* () {
        const batchFilePath = path_1.default.join(baseDirectoryPath, batchName);
        // Log the constructed path for debugging
        console.log(`Processing batch file: ${batchFilePath}`);
        try {
            // Read the individual IMDb batch file
            const imdbData = yield loadIMDBBatchFile(batchFilePath);
            if (imdbData.length === 0) {
                yield updateBatchStatusInExcel(excelFilePath, batchName, 'Movie Comparison Finished');
                return;
            }
            // Processing logic remains the same
            const errors = [];
            const foundMovies = [];
            const imdbDataMap = new Map();
            for (const imdbMovieRaw of imdbData) {
                const imdbMovie = normalizeMovieRecord(imdbMovieRaw);
                imdbDataMap.set(imdbMovie.IMDB_ID, imdbMovie);
            }
            let detailsFound = false;
            for (const dbMovieRaw of dbData) {
                const dbMovie = normalizeMovieRecord(dbMovieRaw);
                const imdbMovie = imdbDataMap.get(dbMovie.IMDB_ID);
                if (imdbMovie) {
                    detailsFound = true;
                    foundMovies.push(`Title: ${imdbMovie.Title}, Year: ${imdbMovie.Year}, IMDB_ID: ${imdbMovie.IMDB_ID}`);
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
            let status = 'Movie Comparison Finished';
            let errorReason = '';
            let foundDetails = '';
            if (detailsFound) {
                if (errors.length > 0) {
                    status = 'Comparison Failed';
                    errorReason = errors.join('; ');
                }
                else {
                    status = 'Movie Details Found';
                    foundDetails = foundMovies.join('; ');
                }
            }
            yield updateBatchStatusInExcel(excelFilePath, batchName, status, errorReason, foundDetails);
            if (errors.length > 0) {
                yield writeDebugDataToFile(`error_${batchName}.json`, JSON.stringify(errors, null, 2));
            }
        }
        catch (error) {
            console.error(`Error processing batch file ${batchFilePath}:`, error instanceof Error ? error.message : error);
        }
    })));
    yield Promise.all(tasks);
    console.log('Batch processing completed.');
});
// Function to load a single IMDb batch file
const loadIMDBBatchFile = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`Reading IMDb batch file: ${filePath}`); // Debugging
        const rawData = yield promises_1.default.readFile(filePath, 'utf-8');
        return JSON.parse(rawData).map(normalizeMovieRecord);
    }
    catch (err) {
        console.error(`Error reading or parsing file ${filePath}:`, err instanceof Error ? err.message : err);
        return [];
    }
});
// Execute the function sequentially
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const limit = (0, p_limit_1.default)(5); // Set up concurrency limit
    const dbData = yield getMoviesFromDB();
    if (dbData.length === 0) {
        console.error('No data retrieved from the database.');
        return;
    }
    yield compareDataSequentially(dbData, excelFilePath, baseDirectoryPath, limit);
});
// Run the script
main().catch(err => console.error('Error in main function:', err instanceof Error ? err.message : err));
