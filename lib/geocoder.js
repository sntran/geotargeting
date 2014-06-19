var thunkify = require( 'thunkify' );
var geocoder = require('geocoder');
var geoip = require('geoip-lite');

module.exports = function ( options ) {
  "use strict";
  var geocode = thunkify( geocoder.geocode.bind( geocoder ) );
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
      var data = yield geocode( address );
      var coordinates = data.results[ 0 ].geometry.location;
      this.params.lat = coordinates.lat;
      this.params.lng = coordinates.lng;
    } else {
      var ip = this.ip;
      var coordinates = geoip.lookup( ip );
      this.params.lat = coordinates[ 0 ];
      this.params.lng = coordinates[ 1 ];
    }

    yield next;
  }
}