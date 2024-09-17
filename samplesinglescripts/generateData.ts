import { faker } from '@faker-js/faker';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import csvParser from 'csv-parser';

// Number of rows
const numRows = 10000;

// Create CSV writer for movies
const movieCsvWriter = createCsvWriter({
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
const actorCsvWriter = createCsvWriter({
  path: 'actors_data.csv',
  header: [
    { id: 'Actor_ID', title: 'Actor_ID' },
    { id: 'Actor_Name', title: 'Actor_Name' }
  ]
});

// Generate unique actors
const actorsMap = new Map();

const getOrCreateActorId = (name: any) => {
  if (!actorsMap.has(name)) {
    const actorId = `actor_${faker.datatype.uuid()}`;
    actorsMap.set(name, actorId);
  }
  return actorsMap.get(name);
};

// Generate movie data
const movieData = Array.from({ length: numRows }, () => {
  const actorNames = Array.from({ length: 3 }, () => faker.name.fullName());
  const actorIds = actorNames.map(getOrCreateActorId).join(', ');

  return {
    Title: faker.lorem.words(3),
    Year: faker.date.past(100).getFullYear(),
    Genre: faker.word.noun(),
    Director: faker.name.fullName(),
    Rating: parseFloat(faker.finance.amount(1, 10, 1)),
    Actor_IDs: actorIds,
    IMDB_ID: `tt${faker.datatype.number({ min: 1000000, max: 9999999 })}`,
    Poster_URL: faker.image.imageUrl()
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
    const results: any[] = [];

    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));
        console.log('Movie CSV has been converted to JSON');
      });
  })
  .catch((err) => {
    console.error('Error writing files:', err);
  });
