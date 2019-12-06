var assert = require("assert");
var main = require('../ts-src/getFullUrlFromResponseUrl');
var getFullUrlFromResponseUrl = main.getFullUrlFromResponseUrl;

assert.equal(
    getFullUrlFromResponseUrl("http://localhost/api", "http://localhost/api/request/fdsf"),
    "http://localhost/api/request/fdsf"
);

assert.equal(
    getFullUrlFromResponseUrl("http://localhost/api", "//localhost/api/request/fdsf"),
    "http://localhost/api/request/fdsf"
);

assert.equal(
    getFullUrlFromResponseUrl("http://localhost/api", "/request/fdsf"),
    "http://localhost/api/request/fdsf"
);

assert.equal(
    getFullUrlFromResponseUrl("http://localhost/api/", "/request/fdsf"),
    "http://localhost/api/request/fdsf"
);

