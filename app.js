


// Setting up server
var debug = require( 'debug' )( 'geotargeting' );
var responseTime = require( 'koa-response-time' );
var etag = require( 'koa-etag' );
var fresh = require( 'koa-fresh' );
var compress = require( 'koa-compress' );
var logger = require( 'koa-logger' );
var router = require( 'koa-router' );
var mask = require( 'koa-json-mask' );

var winston = require( 'winston' );
var loader = require( './lib/loader' )();
var geocoder = require( './lib/geocoder' )();
var locator = require( './lib/locator' )();

var koa = require( 'koa' );
var path = require( 'path' );
var app = module.exports = koa();

// Calculate response time, at the top before any other middleware,
// to wrap all subsequent middlewares.
app.use( responseTime() );
app.use( logger() );
app.use( fresh() );
app.use( etag() );
app.use( compress() );
// Support `fields` query string to reduce response, @see json-mask.
app.use( mask() );
app.use( router( app ) );

// Small fix to prevent request for favicon.ico.
app.get( '/favicon.ico', function *() {
  this.status = 304;
  this.type = "image/x-icon";
} );

app.get( '/locations/:map/:lng/:lat', loader, locator );
app.get( '/locations/:map/:address', loader, geocoder, locator );
app.get( '/locations/:map', loader, geocoder, locator );
app.get( '/:map', loader );

// Start server.
var port = process.env.PORT || 9876;
app.listen( port, function() {
  winston.info( 'Geotargeting service is listening on port %d', port ) ;
});