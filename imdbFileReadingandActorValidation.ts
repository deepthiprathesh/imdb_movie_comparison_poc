import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
const csvParser = require('csv-parser'); // Use require for CSV parser

interface MovieRecord {
  Title: string;
  Year: number;
  Genre: string;
  Director: string;
  Rating: number;
  Actors: string;
  IMDB_ID: string;
  Poster_URL: string;
  Actor_IDs: string; // Assuming each movie has an Actor_IDs field for validation
}

const inputJsonFilePath = path.join('testdata', 'large_imdb_mock_data.json');
const actorsCsvFilePath = path.join('testdata', 'actors_data.csv');
const batchFolderPath = './batches';
const batchSize = 100;

// Function to create or clear the batches folder
const initializeBatchFolder = async (folderPath: string) => {
  if (fsSync.existsSync(folderPath)) {
    // Clear existing files in the folder
    const files = await fs.readdir(folderPath);
    await Promise.all(files.map(file => fs.unlink(path.join(folderPath, file))));
  } else {
    await fs.mkdir(folderPath);
  }
  console.log(`Initialized folder: ${folderPath}`);
};

// Function to split data into batches
const splitIntoBatches = (data: MovieRecord[], batchSize: number): MovieRecord[][] => {
  const batches: MovieRecord[][] = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  return batches;
};

// Function to write batch names and statuses to Excel
const writeBatchesToExcel = async (batches: MovieRecord[][], folderName: string) => {
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
  await workbook.xlsx.writeFile(excelFilePath);
  console.log(`Saved batch status to ${excelFilePath}`);
};

// Function to read and parse the actors CSV file
const readActorsCSV = async (actorsCsvFilePath: string): Promise<Map<string, string>> => {
  const actorsMap = new Map<string, string>();

  await new Promise<void>((resolve, reject) => {
    fsSync.createReadStream(actorsCsvFilePath)
      .pipe(csvParser())
      .on('data', (row: { Actor_ID: string; Actor_Name: string; }) => {
        actorsMap.set(row.Actor_ID, row.Actor_Name);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log('Actors CSV file has been read successfully.');
  return actorsMap;
};

// Function to validate batch files
const validateBatches = async (folderName: string, actorsMap: Map<string, string>) => {
  const workbook = new ExcelJS.Workbook();
  const excelFilePath = path.join(folderName, 'batch_status.xlsx');
  await workbook.xlsx.readFile(excelFilePath);
  const actorSheet = workbook.getWorksheet('Batch Status');
  const movieSheet = workbook.getWorksheet('Movie Validation Status');

  if (!actorSheet || !movieSheet) {
    console.error('Required worksheets not found in the Excel file.');
    return;
  }

  const batchStatusMap = new Map<string, ExcelJS.Row>();
  const notProcessedBatches: string[] = [];

  actorSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) { // Skip header row
      const batchName = row.getCell(1).value as string;
      const actorValidationStatus = row.getCell(2).value as string;
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
  const validateBatch = async (file: string) => {
    const filePath = path.join(folderName, file);
    const rawData = await fs.readFile(filePath, 'utf-8');
    const data: MovieRecord[] = JSON.parse(rawData);
    let allActorsValid = true;
    const errorMessages: string[] = []; // Array to accumulate specific error messages
  
    data.forEach((movie: MovieRecord) => {
      const actorIds = movie.Actor_IDs.split(', ');
  
      actorIds.forEach((actorId: string) => {
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
      } else {
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
    } else {
      console.error(`Batch file "${file}" not found in the Excel status sheet.`);
    }
  
    await workbook.xlsx.writeFile(excelFilePath);
  };
  
  
  
  const processBatchesInChunks = async (files: string[], chunkSize: number) => {
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      console.log(`Processing batches in parallel: ${chunk.join(', ')}`);
      await Promise.all(chunk.map(file => validateBatch(file)));
      console.log(`Completed processing of batches: ${chunk.join(', ')}`);
    }
  };

  await processBatchesInChunks(notProcessedBatches, 10); // Process in chunks of 10
  console.log('All batches have been processed.');
};

// Main function to process the file
const processFile = async () => {
  try {
    // Initialize the batches folder
    await initializeBatchFolder(batchFolderPath);

    // Read JSON data from file
    const rawData = await fs.readFile(inputJsonFilePath, 'utf-8');
    const data: MovieRecord[] = JSON.parse(rawData);

    // Split data into batches
    const batches = splitIntoBatches(data, batchSize);

    // Save each batch to a separate file
    await Promise.all(
      batches.map(async (batch, index) => {
        const filePath = path.join(batchFolderPath, `batch_${index + 1}.json`);
        await fs.writeFile(filePath, JSON.stringify(batch, null, 2));
        console.log(`Saved Batch ${index + 1} to ${filePath}`);
      })
    );

    // Write batch names and statuses to Excel
    await writeBatchesToExcel(batches, batchFolderPath);

    // Read and parse the actors CSV file
    const actorsMap = await readActorsCSV(actorsCsvFilePath);

    // Validate batches
    await validateBatches(batchFolderPath, actorsMap);

    console.log('All batches have been processed and validated.');
  } catch (err) {
    if (err instanceof Error) {
      console.error('An error occurred:', err.message);
    } else {
      console.error('An unknown error occurred:', err);
    }
  }
};

// Call the main function
processFile();
