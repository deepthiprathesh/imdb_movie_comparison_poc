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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const csv_writer_1 = require("csv-writer");
const fs = __importStar(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
// Number of rows
const numRows = 10000;
// Create CSV writer for movies
const movieCsvWriter = (0, csv_writer_1.createObjectCsvWriter)({
    path: 'large_imdb_mock_data.csv',
    header: [
        { id: 'Title', title: 'Title' },
        { id: 'Year', title: 'Year' },
        { id: 'Genre', title: 'Genre' },
        { id: 'Director', title: 'Director' },
        { id: 'Rating', title: 'Rating' },
        { id: 'Actor_IDs', title: 'Actor_IDs' },
        { id: 'IMDB_ID', title: 'IMDB_ID' },
        { id: 'Poster_URL', title: 'Poster_URL' }
    ]
});
// Create CSV writer for actors
const actorCsvWriter = (0, csv_writer_1.createObjectCsvWriter)({
    path: 'actors_data.csv',
    header: [
        { id: 'Actor_ID', title: 'Actor_ID' },
        { id: 'Actor_Name', title: 'Actor_Name' }
    ]
});
// Generate unique actors
const actorsMap = new Map();
const getOrCreateActorId = (name) => {
    if (!actorsMap.has(name)) {
        const actorId = `actor_${faker_1.faker.datatype.uuid()}`;
        actorsMap.set(name, actorId);
    }
    return actorsMap.get(name);
};
// Generate movie data
const movieData = Array.from({ length: numRows }, () => {
    const actorNames = Array.from({ length: 3 }, () => faker_1.faker.name.fullName());
    const actorIds = actorNames.map(getOrCreateActorId).join(', ');
    return {
        Title: faker_1.faker.lorem.words(3),
        Year: faker_1.faker.date.past(100).getFullYear(),
        Genre: faker_1.faker.word.noun(),
        Director: faker_1.faker.name.fullName(),
        Rating: parseFloat(faker_1.faker.finance.amount(1, 10, 1)),
        Actor_IDs: actorIds,
        IMDB_ID: `tt${faker_1.faker.datatype.number({ min: 1000000, max: 9999999 })}`,
        Poster_URL: faker_1.faker.image.imageUrl()
    };
});
// Write movie data to CSV
movieCsvWriter.writeRecords(movieData)
    .then(() => {
    console.log('Movie CSV file was written successfully');
    // Write actors data to CSV
    const actorData = Array.from(actorsMap.entries()).map(([name, id]) => ({
        Actor_ID: id,
        Actor_Name: name
    }));
    return actorCsvWriter.writeRecords(actorData);
})
    .then(() => {
    console.log('Actors CSV file was written successfully');
    // Convert movies CSV to JSON
    const csvFilePath = 'large_imdb_mock_data.csv';
    const jsonFilePath = 'large_imdb_mock_data.json';
    const results = [];
    fs.createReadStream(csvFilePath)
        .pipe((0, csv_parser_1.default)())
        .on('data', (data) => results.push(data))
        .on('end', () => {
        fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));
        console.log('Movie CSV has been converted to JSON');
    });
})
    .catch((err) => {
    console.error('Error writing files:', err);
});
