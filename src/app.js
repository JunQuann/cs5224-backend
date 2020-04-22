import "core-js/stable";
import "regenerator-runtime/runtime";
import express, { json, urlencoded } from "express";
import cors from "cors";
import logger from "morgan";
import _database from "./models";

import userRouteHandler from "./routes/user";
import eventRouteHandler from "./routes/events";

const port = parseInt(process.env.PORT, 10) || 3000;

// Set up the express app
const app = express();

// Log requests to the console.
app.use(logger("dev"));
// Enable CORS request
app.use(cors());

// Parse incoming requests data (https://github.com/expressjs/body-parser)
app.use(json());
app.use(urlencoded({ extended: false }));

app.use("/profile", userRouteHandler);
app.use("/event", eventRouteHandler);

//module.exports = app;
app.listen(port);
