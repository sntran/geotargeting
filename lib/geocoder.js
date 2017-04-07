/*jslint         indent  : 2,    maxerr   : 50,
  esnext : true, -W030   : true, node     : true
*/
"use strict";

var debug = require('debug')('geotargeting:geocoder');
var thunkify = require( 'thunkify' );
var request = require( 'co-request' );
var geoip = require('geoip-lite');

module.exports = function ( options ) {
  geoip.startWatchingDataUpdate();

  options || ( options = {} );
  var geocode = options.geocode;

  return function *geocoder ( next ) {
    var address = this.params.address,
        lat = this.params.lat,
        lng = this.params.lng;

    if (lat && lng) {
      // We don't do anything if lat and lng params are provided.
      yield next;
      return;
    }

    if ( address ) {
      try {
        var coordinates = yield geocode(address);
        debug( 'Geocoded input', address, 'into:', coordinates.lat, coordinates.lng);
        this.params.lat = coordinates.lat;
        this.params.lng = coordinates.lng;

      } catch(error) {
        console.error(error);
        return;
      }
    } else {
      // Have to do this to ensure correct IP on either Heroku or Docker, or regular server.
      var req = this.req;
      var ip = (req.headers['x-forwarded-for'] || '').split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.connection.socket.remoteAddress;
      ip = ip.replace( '::ffff:', '' );
      var lookup = geoip.lookup( ip );
      var coordinates = ( lookup && lookup.ll ) || [];
      lat = coordinates[ 0 ];
      lng = coordinates[ 1 ];
      debug (' GeoIP ' + ip + ' into lat: ' + lat + ', lng: ' + lng );
      this.params.lat = lat;
      this.params.lng = lng;
    }

    yield next;
  };
};