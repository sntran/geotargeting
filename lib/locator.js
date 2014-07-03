var debug = require('debug')('geotargeting:locator');
var thunkify = require( 'thunkify' );
var xml2js = require( 'xml2js' );
var parseString = thunkify( xml2js.parseString );

module.exports = function ( options ) {
  "use strict";
  return function *locator ( next ) {
    var lng = this.params.lng, lat = this.params.lat, kml = this.body;

    if ( !kml || !lng || !lat ) {
      // At this point, if we don't have data, just return
      debug( 'Don\'t have any KML data or longtitude or latitude, return 404' );
      this.status = 404;
      return;
    }

    try {
      var result = yield parseString( kml, { mergeAttrs: true } );
      var layers = result.kml.Document[ 0 ].Folder;
      debug( 'Parsed KML into %d layers', layers.length );

      var locations = [];

      debug( 'User the longtitude %s and latitude %s as the first location', lng, lat );
      locations.push( {
        name: "Start",
        coordinates: [ lng, lat ]
      } );
      
      layers.forEach( function ( layer ) {
        var name = layer.name[ 0 ], placemarks = layer.Placemark;
        if ( !placemarks ) return;

        locations.push.apply( locations, placemarks.map( function ( placemark ) {
          var coordinates = placemark.Point[ 0 ].coordinates[ 0 ].split( "," );
          var parsedLng = coordinates[ 0 ] = parseFloat( coordinates[ 0 ] );
          var parsedLat = coordinates[ 1 ] = parseFloat( coordinates[ 1 ] );
          var extendedData = {};

          placemark.ExtendedData[ 0 ].Data.forEach( function ( el,idx ){
            extendedData[ el.name[ 0 ] ] = el.value[ 0 ];
          });

          return {
            layer: name,
            name: placemark.name[ 0 ],
            coordinates: coordinates,
            extended: extendedData,
            distance: haversine( lat, lng, parsedLat, parsedLng )
          };
        }));
      });

      debug( 'Parsed into %d locations', locations.length );

      locations.sort(function(a, b) {
        return a.distance - b.distance;
      });

      this.type = 'application/json';
      this.body = locations;
    } catch ( e ) {
      console.error( "Error parsing the locations for coordinate ", lng, lat );
    }
  }
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function haversine(lat1, lng1, lat2, lng2) {
  var dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1),
      delta = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2),
      result = 6371 * 2 * Math.atan2(Math.sqrt(delta), Math.sqrt(1 - delta));
  return result;
}