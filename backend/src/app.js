const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectToDatabase } = require('./config/mongo');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

connectToDatabase();

app.use('/', routes);

module.exports = app;

