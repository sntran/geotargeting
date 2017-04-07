/*jslint         indent  : 2,    maxerr   : 50,
  esnext : true, -W030   : true, node     : true
*/
"use strict";

var debug = require('debug')('geotargeting:loader');
var request = require( 'request' );

var KML_BASE_URL = process.env.KML_SERVICE || "http://www.google.com/maps/d/u/0/kml?forcekml=1&mid=";
var QPS = 50;

module.exports = function ( options ) {
  options || ( options = {} );
  var geocode = options.geocode;

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

    debug( 'No cached KML map for ID %s, requesting KML from map service.', mapId, KML_BASE_URL + mapId);
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

  function replaceAddressWithPoint( address, delay ) {
    if (!delay) { delay = 0; }
    return new Promise(function( resolve, reject ) {
      setTimeout(function() {
        if (geocode) {
          geocode(address)
          .then(function(coords) {
            return resolve('<Point><coordinates>' + coords.lng + ',' + coords.lat + ',0</coordinates></Point>');
          }, reject);
        } else {
          resolve('<address>' + address + '</address>');
        }
      }, delay);
    });
  }
};

function fetch( url ) {
  return function( done ) {
    request( url, function(err, response, body) {
      done( err, body );
    } );
  };
}