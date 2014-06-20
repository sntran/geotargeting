geotargeting
============

REST API for Google Map data of nearest locations. It takes locations from a 
KML file served by Google Map Engine, and return nearest ones from either an
address or the user's current location.

Requirements
------------
* Node.js v0.11.3+ for ES6 generators support.
* Redis server for caching.

Usage
-----
To run the service, use `npm start`.
Default port is 9876, use `PORT` environment variable to change.
Cache will default to `redis://localhost:6379` if `process.env.DATABASE_URL`
is not defined.

End points
----------
* `/:map`: the KML file with id `:map`.
* `/locations/:map`: nearest locations in KML data from the
user's current longtitude and latitude based on IP.
* `/locations/:map/:address`: nearest locations in KML data
from the input address. This address is geocoded into long and lat.
* `/locations/:map/:long/:lat`: nearest locations in KML
data from the input long and lat.

Querystring
-----------
Certain queries are supported to deal with JSON response.

* `fields` to remove all but specified fields. See `json-mask`.
* `select` for a more advance selector. See `jspath`.

License
-------
The MIT License (MIT)

Copyright (c) 2014 Son Tran-Nguyen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.