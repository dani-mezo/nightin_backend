# Nightin' backend

## Install

`npm install`

## Start

`mongod.exe`  
`node server.js`

## Test
Open url: [`localhost:8080/test`](http://localhost:8080/test)

## MongoDB
Install mongodb
run `mongod.exe` BEFORE running `node server.js `
(you might want to set up a default database on the same drive as mongodb is installed as e.g.: `e:/data/db/`, or either use the command line argument to set up yours, e.g: `mongod.exe -dbpath 'path/to/your/db'`)
DO NOT restart mongodb during server.js is running, due to reconnection is not implemented yet

## REST API

### `POST /login`
Body: `{username: <username>, password: <password>}`  
REST call can be used to authenticate clients, and generate new token 

Answers can be:  
success: `{token: <valid_token>}`  
error: `{status: 'error', message: <random message>}`

### `POST /auth`
Body: `empty`   
REST call can be used to authenticate client's token.

Answers can be:  
success: `{token: <valid_token>}`  
error: `{status: 'error', message: <random message>}`
  
### `POST /signup`
Body:


    {
        username: <username>,
        password: <password>,
        first_name: <first_name>,
        last_name: <last_name>,
        email: <email>
    }


REST call can be used to sign up. 

Answers can be:  
success: `{<user object>}`  
error: `{status: 'error', message: <random message>}`
  
### `POST /user/:username`
Body: `empty`  
REST call can be used to get full info about a user.  
You must include Basic authentication in http header.
  
### `POST /friend/:username`
Body: `empty`  
REST call can be used to add a friend to the one who is authenticated.  
You must include Basic authentication in http header.

  
### `POST /friends`
Body: `empty`  
REST call can be used to get all the friends of the one who is authenticated.  
You must include Basic authentication in http header.
  
### `POST /achievements/:username`
Body: `empty`  
REST call can be used to achievemenets of the user, specified in the uri.  
You must include Basic authentication in http header.
  
## Important Notes

* RECREATE database before launch this version, due to its not compatible with the old one, and you can get runtime error otherwise.
* Achievements should be calculated only at the server IMO, which is not supported by REST really.
* Due to REST is stateless against the client, every REST call must contain authentication.
* Can be buggy yet.
