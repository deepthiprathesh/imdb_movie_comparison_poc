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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
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
