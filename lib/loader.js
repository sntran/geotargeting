var debug = require('debug')('geotargeting:loader');
var request = require( 'request' );
var fs = require('fs');
var unzip = require('unzip');

var KML_BASE_URL = process.env.KML_SERVICE || "http://mapsengine.google.com/map/u/1/kml?mid=";

module.exports = function ( options ) {
  "use strict";
  return function *loader ( next ) {
    var mapId = this.params.map;

    if ( !mapId ) {
      return;
    }

    if ( this.body && this.type === 'text/xml' ) {
      // We have the map from cache, just go to next middlewares.
      yield next;
      return;
    }

    this.body = yield extract(KML_BASE_URL + mapId);
    this.type = 'text/xml';

    yield next;
  }
}

function extract(url) {
  return function(done) {
    request( url )
    .pipe(unzip.Parse())
    .on('entry', function ( entry ) {
      var data = '';
      entry.on('error', function(err) {
        done(err);
      });

      entry.on('data', function(chunk) {
        data += chunk;
      });

      entry.on('end', function() {
        done(null, data)
      });
    });
  }
}