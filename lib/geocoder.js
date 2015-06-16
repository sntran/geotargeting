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
      var response = yield request( {
        url: "http://maps.googleapis.com/maps/api/geocode/json",
        qs: {
          sensor: false, 
          address: address,
          key: process.env.GOOGLE_API_KEY
        }
      } );
      var data = JSON.parse(response.body);
      debug( 'Geocoded address ' + address + ' into this data ' + data );
      var coordinates = data.results[ 0 ].geometry.location;
      this.params.lat = coordinates.lat;
      this.params.lng = coordinates.lng;
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