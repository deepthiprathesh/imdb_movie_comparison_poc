import * as fs from 'fs/promises';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
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
const writeBatchesToExcel = async (batches, folderName) => {
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
    await workbook.xlsx.writeFile(excelFilePath);
    console.log(`Saved batch status to ${excelFilePath}`);
};
// Main function to process the file
const processFile = async () => {
    try {
        // Read JSON data from file
        const rawData = await fs.readFile(inputJsonFilePath, 'utf-8');
        const data = JSON.parse(rawData);
        // Split data into batches
        const batches = splitIntoBatches(data, batchSize);
        // Create folder with current date-time stamp
        const currentDateTime = new Date().toISOString().replace(/[:.]/g, '-'); // Format: YYYY-MM-DDTHH-MM-SS
        const folderName = `batches_${currentDateTime}`;
        await fs.mkdir(folderName);
        // Save each batch to a separate file
        await Promise.all(batches.map(async (batch, index) => {
            const filePath = path.join(folderName, `batch_${index + 1}.json`);
            await fs.writeFile(filePath, JSON.stringify(batch, null, 2));
            console.log(`Saved Batch ${index + 1} to ${filePath}`);
        }));
        // Write batch names and statuses to Excel
        await writeBatchesToExcel(batches, folderName);
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
};
// Call the main function
processFile();
//# sourceMappingURL=batchJsonInMemory.js.map