function getLocation(req, res) {
  const city = req.query.city;
  const findCitySql = 'SELECT * FROM city WHERE search_query = $1;'
  const sqlArray = [city];
  const url = `https://us1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&format=json&q=${city}&limit=1`;
  const quryParams = {
    key: GEOCODE_API_KEY,
    format: 'json',
    q: city,
    limit: 1
  }
  clint.query(findCitySql, sqlArray)
    .then((dataFromDB) => {
      if (dataFromDB.rowCount === 0) {
        superagent.get(url, quryParams).then(dataFromAPI => {
          console.log('from API');
          const data = dataFromAPI.body[0];
          const city_location = new CityLocation(city, data.display_name, data.lat, data.lon);
          const insertCitySQL = 'INSERT INTO city (search_query , formatted_query, latitude, longitude) VALUES ($1 , $2 , $3, $4)'
          clint.query(insertCitySQL, [city, data.display_name, data.lat, data.lon])
          res.send(city_location);
        });
      }
      else {
        console.log('from Dabtbase')
        const data = dataFromDB.rows[0];
        const city_location = new CityLocation(city, data.formatted_query, data.latitude, data.longitude);
        res.send(city_location);
      }
    }).catch(internalserverError(res));
}