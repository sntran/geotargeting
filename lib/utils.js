var urlParser = require( 'url' ).parse;
var request = require( 'request' );

var GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json?'
                      + 'key=' + process.env.GOOGLE_API_KEY + '&address=';

/**
 * Geocodes and address into coordinates.
 * @param {String} address - The address to geocode.
 * @returns {Function} - a thunk.
 */
function geocode(address) {
  return function(callback) {
    request( {
      method: 'GET',
      url: GEOCODE_BASE_URL + encodeURIComponent(address),
      json: true,
      gzip: true
    }, function(err, response, data) {
      if (err) {
        return callback(err);
      }
      if (data.error_message) {
        console.error(address, data.error_message);
        return callback(data.error_message);
      }

      var coords = data.results[ 0 ].geometry.location;
      callback(null, coords);
    } );
  }
}

var Redis = require( 'redis' );
var wrapper = require( 'co-redis' );

function getStorage(databaseUrl) {
  if (!databaseUrl) {
    databaseUrl = 'redis://localhost:6379';
  }
  var uri = urlParser( databaseUrl );
  var port = uri.port;
  var host = uri.hostname;
  var auth = uri.auth;
  var client = wrapper( Redis.createClient( port, host ) );

  if (auth) {
    client.auth( auth.split( ":" )[1] );
  }
  return client;
}

module.exports = {
  geocode: geocode,
  getStorage: getStorage
}