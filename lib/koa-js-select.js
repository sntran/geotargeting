var JSPath = require('jspath');

/**
 * Navigate and find data within JSON body response.
 *
 *  - `name` querystring param name [select]
 *
 * @param {Object} opts
 * @return {GeneratorFunction}
 * @api public
 */

module.exports = function (opts) {
  opts = opts || {};
  var name = opts.name || 'select';

  return function *select(next) {
    yield *next;

    var body = this.body;

    // non-json
    if (!body || 'object' != typeof body) return;

    // check for fields
    var selector = this.query[name];
    if (!selector) return;

    try {
      this.body = JSPath.apply(selector, body);
    } catch ( e ) {
      this.throw(404, "Can't find data with selector '" + selector + "'");
    }
  };
};