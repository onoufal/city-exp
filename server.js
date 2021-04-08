'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());



app.get('/location', getLocation);

app.get('*', (req, res) => {
  console.log('Something hit  me');
  res.send('Ouch');
});

app.listen(PORT, () => {
  console.log(`server is listening to port ${PORT}`);
});


function getLocation(req, res) {
  res.send(
    [
      {
        "search_query": "seattle",
        "formatted_query": "Seattle, WA, USA",
        "latitude": "47.606210",
        "longitude": "-122.332071"
      }
    ]
  );
}