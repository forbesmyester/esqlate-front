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
    getFullUrlFromResponseUrl("http://localhost/api", "/api2/request/fdsf"),
    "http://localhost/api2/request/fdsf"
);

assert.equal(
    getFullUrlFromResponseUrl("http://localhost:8080/api", "/api2/request/fdsf"),
    "http://localhost:8080/api2/request/fdsf"
);

