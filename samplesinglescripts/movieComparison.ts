import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import ExcelJS from 'exceljs';

// Function to write debug data to a file
const writeDebugDataToFile = async (fileName: string, data: string) => {
  try {
    // Create the 'errorlog' folder if it does not exist
    const errorLogFolderPath = path.join(__dirname, 'errorlog');
    await fs.mkdir(errorLogFolderPath, { recursive: true });

    // Write the file to the 'errorlog' folder
    const filePath = path.join(errorLogFolderPath, fileName);
    await fs.writeFile(filePath, data, 'utf-8');
  } catch (err) {
    console.error('Error writing debug data to file:', err instanceof Error ? err.message : err);
  }
};

// Define the type for movie records
interface MovieRecord {
  Title: string;
  Year: number;
  Genre: string;
  Director: string;
  Rating: number;
  Actors: string;
  IMDB_ID: string;
  Poster_URL: string;
}

// Set up PostgreSQL database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nokio',
  password: '123456',
  port: 5433,
});

// Update these paths to match your new directory
const baseDirectoryPath = 'C:\\Users\\DeepthiK\\Downloads\\nokio\\batches'; // Update base directory path
const excelFilePath = path.join(baseDirectoryPath, 'batch_status.xlsx'); // Excel file location
const imdbDirectoryPath = baseDirectoryPath; // IMDb batch files directory

// Function to get movie records from the database
const getMoviesFromDB = async (): Promise<MovieRecord[]> => {
  try {
    const result = await pool.query('SELECT * FROM movies');
    return result.rows.map((row: any) => ({
      Title: row.title,
      Year: parseInt(row.year, 10),
      Genre: row.genre,
      Director: row.director,
      Rating: parseFloat(row.rating),
      Actors: row.actor_ids,
      IMDB_ID: row.imdb_id,
      Poster_URL: row.poster_url,
    }));
  } catch (err) {
    console.error('Error executing database query:', err instanceof Error ? err.message : err);
    return [];
  }
};

// Function to read batch status from Excel and filter "Not Processed" batches
const getNotProcessedBatches = async (excelFilePath: string): Promise<string[]> => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(excelFilePath);
  } catch (err) {
    console.error('Error reading Excel file:', err instanceof Error ? err.message : err);
    return [];
  }
  
  const worksheet = workbook.getWorksheet('Batch Status');
  const notProcessedBatches: string[] = [];

  if (!worksheet) {
    console.error('Worksheet "Batch Status" not found in the Excel file.');
    return notProcessedBatches;
  }

  worksheet.eachRow((row) => {
    const batchName = row.getCell(1).value?.toString() || "";
    const movieValidationStatus = row.getCell(3).value?.toString();
    if (movieValidationStatus === 'Not Processed') {
      notProcessedBatches.push(batchName);
    }
  });

  return notProcessedBatches;
};

// Function to update batch status in Excel
const updateBatchStatusInExcel = async (excelFilePath: string, batchName: string, status: string) => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(excelFilePath);
  } catch (err) {
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
    await workbook.xlsx.writeFile(excelFilePath);
  } catch (err) {
    console.error('Error writing to Excel file:', err instanceof Error ? err.message : err);
  }
};

// Function to load IMDb batch files
const loadIMDBBatchFiles = async (directoryPath: string, batchFiles: string[]): Promise<MovieRecord[]> => {
  const imdbData: MovieRecord[] = [];
  for (const batchFile of batchFiles) {
    const filePath = path.join(directoryPath, batchFile);
    try {
      const rawData = await fs.readFile(filePath, 'utf-8');
      const batchData: MovieRecord[] = JSON.parse(rawData);
      imdbData.push(...batchData);
    } catch (err) {
      console.error(`Error reading or parsing file ${batchFile}:`, err instanceof Error ? err.message : err);
    }
  }
  return imdbData;
};

// Function to normalize movie records
const normalizeMovieRecord = (record: any): MovieRecord => {
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
const compareData = async (dbData: MovieRecord[], imdbData: MovieRecord[], batchName: string, excelFilePath: string) => {
  const errors: string[] = [];

  for (const dbMovieRaw of dbData) {
    const dbMovie = normalizeMovieRecord(dbMovieRaw);
    let match: MovieRecord | undefined;

    for (const imdbMovieRaw of imdbData) {
      const imdbMovie = normalizeMovieRecord(imdbMovieRaw);
      if (imdbMovie.IMDB_ID === dbMovie.IMDB_ID) {
        match = imdbMovie;
        break;
      }
    }

    if (!match) {
      errors.push(`Movie with IMDB_ID ${dbMovie.IMDB_ID} not found in IMDb batch files.`);
    } else {
      for (const key of Object.keys(dbMovie)) {
        const dbValue = dbMovie[key as keyof MovieRecord];
        const imdbValue = match[key as keyof MovieRecord];

        if (key === 'Actors') {
          const dbActorList = (typeof dbValue === 'string' ? dbValue.split(',').map(id => id.trim()).sort() : []);
          const imdbActorList = (typeof imdbValue === 'string' ? imdbValue.split(',').map(id => id.trim()).sort() : []);
          if (JSON.stringify(dbActorList) !== JSON.stringify(imdbActorList)) {
            errors.push(`Mismatch for movie ID ${dbMovie.IMDB_ID}: Field ${key} (DB: ${dbValue}, IMDb: ${imdbValue})`);
          }
        } else if (
          (typeof dbValue === 'number' && typeof imdbValue === 'string' && dbValue !== parseFloat(imdbValue)) ||
          (typeof dbValue === 'string' && dbValue !== imdbValue)
        ) {
          errors.push(`Mismatch for movie ID ${dbMovie.IMDB_ID}: Field ${key} (DB: ${dbValue}, IMDb: ${imdbValue})`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('Data mismatches found:', errors);
    await writeDebugDataToFile(`${batchName}_errors.txt`, errors.join('\n'));
  } else {
    console.log(`Movie comparison finished for batch: ${batchName}`);
  }

  await updateBatchStatusInExcel(excelFilePath, batchName, 'Movie Comparison Finished');
};

// Main function to load data and perform comparison
// Main function to load data and perform comparison
const main = async () => {
  try {
    const notProcessedBatches = await getNotProcessedBatches(excelFilePath);
    const chunkedBatches = batchChunks(notProcessedBatches, 10);

    for (const chunk of chunkedBatches) {
      await Promise.all(
        chunk.map(async (batchFile) => {
          const imdbData = await loadIMDBBatchFiles(imdbDirectoryPath, [batchFile]);
          const dbData = await getMoviesFromDB();
          await compareData(dbData, imdbData, batchFile, excelFilePath);
        })
      );
    }
  } catch (err) {
    console.error('Error in main function:', err instanceof Error ? err.message : err);
  } finally {
    await pool.end();
  }
};

// Function to chunk batches into groups for parallel processing
const batchChunks = (array: string[], size: number): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Run the main function
main();
