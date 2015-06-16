// Setting up server
var debug = require( 'debug' )( 'geotargeting' );
var responseTime = require( 'koa-response-time' );
var etag = require( 'koa-etag' );
var fresh = require( 'koa-fresh' );
var compress = require( 'koa-compress' );
var logger = require( 'koa-logger' );
var router = require( 'koa-router' );
var mask = require( 'koa-json-mask' );
var jsonp = require( 'koa-jsonp' );
var selector = require( './lib/koa-js-select' );

var loader = require( './lib/loader' )();
var geocoder = require( './lib/geocoder' )();
var locator = require( './lib/locator' )();
var cache = require( './lib/cache' )( {
  storage: process.env.DATABASE_URL,
} );

var koa = require( 'koa' );
var path = require( 'path' );
var app = module.exports = koa();

// Calculate response time, at the top before any other middleware,
// to wrap all subsequent middlewares.
app.use( responseTime() );
app.use( logger() );
// app.use( fresh() );
// app.use( etag() );
app.use( compress() );
app.use( jsonp() );
// Support `fields` query string to reduce response, @see json-mask.
app.use( mask() );
app.use( selector() );
app.use( router( app ) );

// Small fix to prevent request for favicon.ico.
app.get( '/favicon.ico', function *() {
  this.status = 304;
  this.type = "image/x-icon";
} );

// The routes are first handled by geocoder to ensure lng and lat params.
// It then goes through the first cache layer that will check for locations
// cache to return. If not, if then check if the map KML is cached and set
// the body so that the loader does not request Google again. The loader
// prepare the body with map data if necessary, then go through the second
// cache layer. This cache sees that the body is filled, so it updates 
// with the new data, ensuring cache for next request. The locator then fills
// the body with nearest locations as JSON. This JSON will be cached by the 
// first cache layer before returned to the client.
app.get( '/locations/:map/:lng/:lat', cache, loader, cache, locator );
app.get( '/locations/:map/:address', geocoder, cache, loader, cache, locator );
app.get( '/locations/:map', geocoder, cache, loader, cache, locator );
app.get( '/:map', cache, loader );

// Start server.
var port = process.env.PORT || 9876;
app.listen( port, function() {
  debug( 'Geotargeting service is listening on port %d', port ) ;
});