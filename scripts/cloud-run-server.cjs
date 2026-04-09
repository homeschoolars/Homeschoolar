"use strict"

// Next standalone `server.js` does: `const hostname = process.env.HOSTNAME || '0.0.0.0'`
// Cloud Run sets HOSTNAME to the revision/pod id (not a bindable host), which can make
// listen() fail with getaddrinfo ENOTFOUND. Set this in-process before any Next code runs.
process.env.HOSTNAME = "0.0.0.0"

require("./server.js")
