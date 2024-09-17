import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import ExcelJS from 'exceljs';
import pLimit from 'p-limit';
// Function to write debug data to a file
const writeDebugDataToFile = async (fileName, data) => {
    try {
        const errorLogFolderPath = path.join(__dirname, 'errorlog');
        await fs.mkdir(errorLogFolderPath, { recursive: true });
        const filePath = path.join(errorLogFolderPath, fileName);
        await fs.writeFile(filePath, data, 'utf-8');
    }
    catch (err) {
        console.error('Error writing debug data to file:', err instanceof Error ? err.message : err);
    }
};
// Set up PostgreSQL database connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'nokio',
    password: '123456',
    port: 5433,
});
const baseDirectoryPath = path.join('C:', 'Users', 'DeepthiK', 'Downloads', 'nokio', 'batches');
const excelFilePath = path.join(baseDirectoryPath, 'batch_status.xlsx');
// Function to get movie records from the database
const getMoviesFromDB = async () => {
    try {
        const result = await pool.query('SELECT * FROM movies');
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
};
// Function to read batch status from Excel and filter "Not Processed" batches
const getNotProcessedBatches = async (excelFilePath) => {
    const workbook = new ExcelJS.Workbook();
    try {
        console.log(`Reading Excel file at: ${excelFilePath}`); // Debugging path
        await workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet('Movie Validation Status');
        if (!worksheet)
            throw new Error('Worksheet "Movie Validation Status" not found.');
        return worksheet.getColumn(2).values
            .slice(1)
            .map((status, index) => (status === 'Not Processed' ? worksheet.getCell(index + 1, 1).value?.toString() : null))
            .filter(batchName => batchName !== null);
    }
    catch (err) {
        console.error('Error reading Excel file:', err instanceof Error ? err.message : err);
        return [];
    }
};
// Function to update batch status in Excel
const updateBatchStatusInExcel = async (excelFilePath, batchName, status, reason = '', foundDetails = '') => {
    const workbook = new ExcelJS.Workbook();
    try {
        console.log(`Updating Excel file at: ${excelFilePath} for batch: ${batchName}`); // Debugging
        await workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet('Movie Validation Status');
        if (!worksheet)
            throw new Error('Worksheet "Movie Validation Status" not found.');
        let found = false;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            if (row.getCell(1).value?.toString() === batchName) {
                row.getCell(2).value = status;
                row.getCell(3).value = reason;
                row.getCell(4).value = foundDetails; // Write movie details found to the next column
                found = true;
            }
        });
        if (!found)
            throw new Error(`Batch name ${batchName} not found in the worksheet.`);
        await workbook.xlsx.writeFile(excelFilePath);
    }
    catch (err) {
        console.error('Error writing to Excel file:', err instanceof Error ? err.message : err);
    }
};
// Function to load IMDb batch files
const loadIMDBBatchFiles = async (directoryPath) => {
    const imdbData = [];
    try {
        console.log(`Reading IMDb batch files from directory: ${directoryPath}`); // Debugging
        const batchFiles = await fs.readdir(directoryPath);
        for (const batchFile of batchFiles) {
            const filePath = path.join(directoryPath, batchFile);
            const stat = await fs.stat(filePath);
            if (stat.isFile() && path.extname(batchFile).toLowerCase() === '.json') {
                try {
                    const rawData = await fs.readFile(filePath, 'utf-8');
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
};
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
const compareDataSequentially = async (dbData, excelFilePath, baseDirectoryPath, limit) => {
    const notProcessedBatches = await getNotProcessedBatches(excelFilePath);
    if (notProcessedBatches.length === 0) {
        console.log('No "Not Processed" batches found.');
        return;
    }
    const tasks = notProcessedBatches.map(batchName => limit(async () => {
        const batchFilePath = path.join(baseDirectoryPath, batchName);
        // Log the constructed path for debugging
        console.log(`Processing batch file: ${batchFilePath}`);
        try {
            // Read the individual IMDb batch file
            const imdbData = await loadIMDBBatchFile(batchFilePath);
            if (imdbData.length === 0) {
                await updateBatchStatusInExcel(excelFilePath, batchName, 'Movie Comparison Finished');
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
            await updateBatchStatusInExcel(excelFilePath, batchName, status, errorReason, foundDetails);
            if (errors.length > 0) {
                await writeDebugDataToFile(`error_${batchName}.json`, JSON.stringify(errors, null, 2));
            }
        }
        catch (error) {
            console.error(`Error processing batch file ${batchFilePath}:`, error instanceof Error ? error.message : error);
        }
    }));
    await Promise.all(tasks);
    console.log('Batch processing completed.');
};
// Function to load a single IMDb batch file
const loadIMDBBatchFile = async (filePath) => {
    try {
        console.log(`Reading IMDb batch file: ${filePath}`); // Debugging
        const rawData = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(rawData).map(normalizeMovieRecord);
    }
    catch (err) {
        console.error(`Error reading or parsing file ${filePath}:`, err instanceof Error ? err.message : err);
        return [];
    }
};
// Execute the function sequentially
const main = async () => {
    const limit = pLimit(5); // Set up concurrency limit
    const dbData = await getMoviesFromDB();
    if (dbData.length === 0) {
        console.error('No data retrieved from the database.');
        return;
    }
    await compareDataSequentially(dbData, excelFilePath, baseDirectoryPath, limit);
};
// Run the script
main().catch(err => console.error('Error in main function:', err instanceof Error ? err.message : err));
//# sourceMappingURL=updatetestParallel.js.map