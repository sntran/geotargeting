/*jslint         indent  : 2,    maxerr   : 50,
  esnext : true, -W030   : true, node     : true
*/
"use strict";

var debug = require('debug')('geotargeting:loader');
var request = require( 'request' );
var fs = require('fs');
var unzip = require('unzip2');

var KML_BASE_URL = process.env.KML_SERVICE || "http://mapsengine.google.com/map/u/1/kml?mid=";

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

    debug( 'No cached KML map for ID %s, requesting KMZ and extracting from map service.', mapId );
    this.body = yield extract(KML_BASE_URL + mapId);
    this.type = 'text/xml';

    yield next;
  };
};

function extract(url) {
  return function(done) {
    request( url )
    .pipe(unzip.Parse())
    .on('entry', function ( entry ) {
      var fileName = entry.path;
      var type = entry.type; // 'Directory' or 'File' 
      if (fileName.indexOf('.kml') === -1) {
        entry.autodrain();
        return;
      }
      
      var data = '';
      entry.on('error', function(err) {
        done(err);
      });

      entry.on('data', function(chunk) {
        data += chunk;
      });

      entry.on('end', function() {
        done(null, data);
      });
    })
    .on('error', done);
  };
}