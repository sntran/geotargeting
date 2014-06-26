var thunkify = require( 'thunkify' );
var request = require( 'co-request' );
var geoip = require('geoip-lite');

module.exports = function ( options ) {
  "use strict";
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
      this.params.lat = coordinates[ 0 ];
      this.params.lng = coordinates[ 1 ];
    }

    yield next;
  }
}