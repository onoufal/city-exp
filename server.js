'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const PARKS_API_KEY = process.env.PARKS_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;
const MOVIE_API_KEY = process.env.MOVIE_API_KEY;

const client = new pg.Client(DATABASE_URL);

const app = express();
app.use(cors());

app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/parks', getParks);
app.get('/movies', getMovies);
app.get('/yelp', getYelp);

app.use('*', notFound);

client.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`server is listening to port ${PORT}`);
  });
});

function getLocation(req, res) {
  const city = req.query.city;
  const findCitySQL = 'SELECT * FROM city WHERE search_query = $1;';
  const sqlArray = [city];
  const url = `https://eu1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;
  client.query(findCitySQL, sqlArray).then((dataFromDB) => {
    if (dataFromDB.rowCount === 0) {
      superagent.get(url).then(dataFromAPI => {
        // console.log(dataFromAPI.body);
        const data = dataFromAPI.body[0];
        const location = new Location(city, data.display_name, data.lat, data.lon);
        res.send(location);
      });
    } else {
      const data = dataFromDB.rows[0];
      const location = new Location(city, data.formatted_query, data.latitude, data.longitude);
      res.send(location);
    }
  }).catch(InternalServerError(res))
}

function InternalServerError(res) {
  return (error) => {
    console.log(error);
    res.status(500).send('Something went wrong');
  };
}

function getWeather(req, res) {
  const city = req.query.search_query;
  const url = 'https://api.weatherbit.io/v2.0/forecast/daily';
  const queryParams = {
    city,
    key: WEATHER_API_KEY,
  };
  superagent.get(url, queryParams).then(dataFromAPI => {
    // console.log(dataFromAPI.body);
    const forecasts = dataFromAPI.body.data.map(data => {
      return new Forecast(data.weather.description, data.datetime);
    });
    res.send(forecasts);
  }).catch(InternalServerError(res));
}

function getParks(req, res) {
  const city = req.query.search_query;
  const url = 'https://developer.nps.gov/api/v1/parks';
  const queryParams = {
    q: city,
    api_key: PARKS_API_KEY,
  };
  superagent.get(url, queryParams).then(dataFromAPI => {
    const parks = dataFromAPI.body.data.map(data => {
      const address = `${data.addresses[0].line1}, ${data.addresses[0].city}, ${data.addresses[0].state}`;
      return new Park(data.fullName, address, data.entranceFees[0].cost, data.description, data.url)
    });
    if (parks.length === 0) {
      res.status(404).send('Not Found');
    } else {
      res.send(parks);
    }
  }).catch(InternalServerError(res));
}

function getMovies(req, res) {
  const city = req.query.search_query;
  const url = 'https://api.themoviedb.org/3/movie/top_rated';
  const queryParams = {
    query: city,
    api_key: MOVIE_API_KEY,
  };
  superagent.get(url, queryParams).then(dataFromAPI => {
    const movies = dataFromAPI.body.results.map(data => new Movie(data));
    res.send(movies);
  }).catch(InternalServerError(res));
}

function getYelp(req, res) {
  const city = req.query.search_query;
  const url = 'https://api.yelp.com/v3/businesses/search';
  const queryParams = {
    location: city,
    term: 'restaurants'
  };
  superagent.get(url, queryParams).set('Authorization', `Bearer ${YELP_API_KEY}`).then(dataFromAPI => {
    const resturants = dataFromAPI.body.businesses.map(data => new Restuarant(data));
    res.send(resturants);
  }).catch(InternalServerError(res));
}

function notFound(req, res) {
  res.status(404).send('Not Found');
}

function Location(search_query, formatted_query, latitude, longitude) {
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
}

function Forecast(forecast, time) {
  this.forecast = forecast;
  this.time = time;
}
function Park(fullName, address, cost, description, url) {
  this.fullname = fullName;
  this.address = address;
  this.cost = cost;
  this.description = description;
  this.url = url;
}

function Restuarant(data) {
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.image_url;
  this.rating = data.rating;
  this.url = data.url;
}

function Movie(data) {
  this.title = data.Forecasttitle;
  this.overview = data.overview;
  this.average_votes = data.votes_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  this.popularity = data.popularity;
  this.released_on = data.released_date;
}