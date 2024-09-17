import * as fs from 'fs';
const inputJsonFilePath = 'large_imdb_mock_data.json';
const outputBatchPrefix = 'batch_';
const batchSize = 100;
// Read JSON data from file
const rawData = fs.readFileSync(inputJsonFilePath, 'utf-8');
const data = JSON.parse(rawData);
// Function to split data into batches
const splitIntoBatches = (data, batchSize) => {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }
    return batches;
};
// Split data into batches
const batches = splitIntoBatches(data, batchSize);
// Write each batch to a separate file
batches.forEach((batch, index) => {
    const batchFilePath = `${outputBatchPrefix}${index + 1}.json`;
    fs.writeFileSync(batchFilePath, JSON.stringify(batch, null, 2));
    console.log(`Batch ${index + 1} written to ${batchFilePath}`);
});
//# sourceMappingURL=batchJson.js.map