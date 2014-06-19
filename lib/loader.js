var request = require( 'co-request' );

var KML_BASE_URL = "http://mapsengine.google.com/map/u/1/kml?mid=";

module.exports = function ( options ) {

  return function *loader ( next ) {
    var mapId = this.params.map;

    if ( !mapId ) {
      return;
    }
    
    var response = yield request( KML_BASE_URL + mapId );
    this.body = response.body;
    this.type = 'text/xml';

    yield next;
  }
}