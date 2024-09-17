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
// query.ts
const db_1 = __importDefault(require("./db"));
// Function to get movies data
const getMovies = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Execute the query to fetch data from the 'movies' table
        const result = yield db_1.default.query('SELECT * FROM movies');
        // Log the result
        console.log(result.rows);
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('Error executing query:', err.message);
        }
        else {
            console.error('Unknown error occurred:', err);
        }
    }
    finally {
        yield db_1.default.end();
    }
});
getMovies();
