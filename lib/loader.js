/*jslint         indent  : 2,    maxerr   : 50,
  esnext : true, -W030   : true, node     : true
*/
"use strict";

var debug = require('debug')('geotargeting:loader');
var request = require( 'request' );

var KML_BASE_URL = process.env.KML_SERVICE || "http://www.google.com/maps/d/u/0/kml?forcekml=1&mid=";
var GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json?'
                      + 'key=' + process.env.GOOGLE_API_KEY + '&address=';
var QPS = 50;

module.exports = function ( options ) {
  return function *loader ( next ) {
    var mapId = this.params.map;

    if ( !mapId ) {
      return;
    }

    if ( this.body && this.type === 'text/xml' ) {
      // We have the map from cache, just go to next middlewares.
      debug( 'Retrieved KML map for ID %s from cache.', mapId );
      yield next;
      return;
    }

    debug( 'No cached KML map for ID %s, requesting KMZ and extracting from map service.', mapId, KML_BASE_URL + mapId);
    var kml = yield fetch(KML_BASE_URL + mapId);

    var regex = /<address>((?:(?!<\/address>)[\S\s])*)<\/address>/g;
    var matches;
    var count = 0;
    var geocodePromises = [];

    while ((matches = regex.exec(kml)) !== null) {
      count++;

      // Because we want to capture the current match index, we need a scope.
      var promise = (function(address, index, length) {
        // For every QPS requests, we increase a delay by 1 second to bypass rate-limit.
        return replaceAddressWithPoint(address, 1000 * Math.floor(count / QPS))
        .then(function(replacement) {
          return {
            index: index,
            length: length,
            replacement: replacement
          };
        }, function(err) {
          console.error(err, 'for', address);
        })
      })(matches[1], matches.index, matches[0].length)

      geocodePromises.push(promise);
    }

    debug('Geocoding', geocodePromises.length, 'addresses.');

    this.body = yield Promise.all(geocodePromises).then(function(replacements) {
      // This will also work when there is no address to geocode, it
      // simply returns the original KML.
      return replacements.reverse().reduce(function (acc, match) {
        var prefix = acc.slice(0, match.index);
        var postfix = acc.slice(match.index + match.length);

        return prefix + match.replacement + postfix;
      }, kml);
    });

    this.type = 'text/xml';

    yield next;
  };
};

function fetch( url ) {
  return function( done ) {
    request( url, function(err, response, body) {
      done( err, body );
    } );
  };
}

function replaceAddressWithPoint( address, delay ) {
  if (!delay) { delay = 0; }
  return new Promise(function( resolve, reject ) {
    setTimeout(function() {
      geocode(address)(function(err, coords) {
        if (err) {
          return reject(err);
        }
        return resolve('<Point><coordinates>' + coords.lng + ',' + coords.lat + ',0</coordinates></Point>');
      });
    }, delay);
  });
}

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