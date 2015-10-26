# Nightin' backend

## Install

* `npm install`

## Start

* `mongod.exe`
* `node server.js`

## Test

* In browser type: localhost/test

## MongoDB

* Install mongodb
* run `mongod.exe` BEFORE running `node server.js `
* (you might want to set up a default database on the same drive as mongodb is installed as e.g.: `e:/data/db/`, or either use the command line argument to set up yours, e.g: `mongod.exe -dbpath 'path/to/your/db'`)
* DO NOT restart mongodb during server.js is running, due to reconnection is not implemented yet

## REST API

* `/login/:user/:password` GET REST call can be used to authenticate clients. Answers can be:
  * `{status: "success", token: "recently_generated_token"}` OR
  * `{status: "error", message: "random message"}`

* `/auth/:user/:token` GET REST call can be used to authenticate clients. Answers can be:
  * `{status: "success"}` OR
  * `{status: "error", message: "random message"}`
  
* `/signup` POST REST call can be used to sign up. Answers can be:
  * `{status: "success"}` OR
  * `{status: "error", message: "random message"}`