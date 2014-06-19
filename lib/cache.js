var Redis = require( 'redis' );
var wrapper = require( 'co-redis' );
var urlParser = require( 'url' ).parse;

module.exports = function ( options ) {
  "use strict";
  options || ( options = {} );
  var expiration = options.expire || 3600;
  var storage = options.storage || 'redis://localhost:6379'
  var parsedUrl = urlParser( storage );
  var port = parsedUrl.port;
  var host = parsedUrl.hostname;
  var auth = parsedUrl.auth;
  var client = wrapper( Redis.createClient( port, host ) );

  if (auth) { 
    client.auth( auth.split( ":" )[1] );
  }

  return function *cache ( next ) {
    var mapId = this.params.map;
    var lat = this.params.lat;
    var lng = this.params.lng;
    var loader = next;

    if ( !mapId ) {
      return;
    }

    if ( this.body ) {
      // This is a middle cache, so we just save the body, and move on.
      yield save( this, 'map:' + mapId, expiration );
      yield next;
      return;
    }

    try {
      var cacheKey = 'locations:' + mapId + "," + lat + "," + lng;
      var locations;
      if ( lat && lng && ( locations = yield client.get( cacheKey ) ) ) {
        // We have locations for that :lng, :lat in that :map, just return.
        this.body = JSON.parse( locations );
        this.type = 'application/json';
        return;
      }

      var map = yield client.get( 'map:' + mapId );

      if (map) {
        this.type = 'text/xml';
        this.body = map;
      }

      // Let the other middlewares to fill the body. We don't worry about
      // saving the map to cache at this point, but let another cache handler
      // save it after the loader.
      yield next;
      yield save( this, cacheKey, expiration );
      return;

    } catch ( e ) {
      console.error( 'Failed to retrieve data from cache with error ' + e );
    }
  }

  function *save ( ctx, key, expiration ) {
    var response = ctx.body;
    if ( ( ctx.method !== 'GET' ) || ( ctx.status !== 200 ) || !response ) {
      return;
    }
    
    // Store the body to cache.
    if ( ctx.type === 'application/json' ) {
      response = JSON.stringify( response );
    }
    yield client.setex( key, expiration, response );
  }
}

