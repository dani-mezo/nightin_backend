var express = require('express');
var hash = require('password-hash');
var app = express();
var server = require('http').Server(app);
var router = express.Router();
var path = require('path');
var bodyParser = require('body-parser');
var util = require("util");


var logger = require('./logger.js')();
var database = require('./database.js')(logger);
var passport = require('./passport.js')(database, logger);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


var server_port = 8080;
var server_ip_address = '127.0.0.1';
var server_interface = '0.0.0.0';

server.listen(server_port, server_interface);
logger.info('[Server] Nightin-backend server is listening on interface %s:%s', server_interface, server_port);

app.use(express.static(__dirname + '/public'));

router.use(function (req, res, next) {

    //TODO log authentication information

    logger.info('Request %s to %s', req.method, req.path);
    next();
});

router.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
    logger.info('Requested test.html');
});

app.use('/', router);

/*********************************************************************************************************************************************/
/*************************************************************** REST API ********************************************************************/
/*********************************************************************************************************************************************/


/*************************************************************** LOGIN ********************************************************************/

router.post('/login', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    // Rare passwords should not be logged
    database.getUser(username, {
        success: function (user) {

            if (hash.verify(password, user.password)) {
                var token = generate_key();
                logger.debug("[Login] Token generated for user: " + username + ", token:" + token);
                database.addTokenToUser(user, token, {
                    success: function () {
                        res.json({token: token});
                    },
                    error: function (error) {
                        res.status(500);
                        res.json({status: 'error', message: error});
                    }
                })
            } else {
                logger.debug('[Login] Wrong password for the user <%s>', username);
                res.status(401);
                res.json({status: 'error', message: 'Wrong username or password!'});
            }

        },
        notFound: function () {
            res.status(404);
            res.json({status: 'error', message: 'User not found'});
        },
        error: function (error) {
            res.status(500);
            res.json({status: 'error', message: error});
        }
    });
});

/*************************************************************** RANDOM AUTH ********************************************************************/

router.post('/auth', passport.authenticate('basic', {session: false}), function (req, res, next) {
    res.json({token: req.user.token});
});

/*************************************************************** SIGN UP ********************************************************************/
router.post('/signup', function (req, res, next) {

    var username = req.body.username;
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var email = req.body.email;
    var rare = req.body.password;
    var password = hash.generate(rare);
    var newUser = new database.User(username, password, first_name, last_name, email, "");

    logger.debug('[Signup] Username: %s', username);
    logger.debug('[Signup] Email: %s', username);
    logger.debug('[Signup] First name: %s', username);
    logger.debug('[Signup] Last name: %s', username);

    if (username === undefined || username === "" ||
        email === undefined || email === "" ||
        first_name === undefined || first_name === "" ||
        last_name === undefined || last_name === "" ||
        rare === undefined || rare === "") {

        logger.warn('[Signup] Invalid form!');
        res.status(400); //bad request
        res.json({status: 'error', message: 'Invalid form!'});
        return;
    }

    logger.info('[Signup] Sign up request username: <%s> email: %s', username, email);

    database.getUser(username, {
        success: function (user) {
            res.status(409); //conflict
            res.json({status: 'error', message: 'Username is already taken!'});
        },
        notFound: function () {
            database.addUser(newUser, {
                success: function () {
                    res.json({user: newUser});
                },
                error: function (error) {
                    res.status(500);
                    res.json({status: 'error', message: error});
                }
            });
        },

        error: function (error) {
            res.status(500);
            res.json({status: 'error', message: error});
        }
    });
});


/*************************************************************** GET USER ********************************************************************/
router.post('/user/:username', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var usernameToGet = req.params.username;

    database.getUser(usernameToGet, {
        success: function (user) {
            res.json({user: user});
        },
        notFound: function () {
            res.status(404);
            res.json({status: 'error', message: 'User not found'});
        },
        error: function (error) {
            res.status(500);
            res.json({status: 'error', message: error});
        }
    });
});

/*************************************************************** ADD FRIEND ********************************************************************/

router.post('/friend/:username', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var usernameToAdd = req.params.username;

    database.addFriendNameToUser(req.user, usernameToAdd, {
        success: function (user) {
            res.json({friends: user.friends});
        },
        notFound: function () {
            res.status(404);
            res.json({status: 'error', message: 'User not found'});
        },
        error: function (error) {
            res.status(500);
            res.json({status: 'error', message: error});
        }
    });
});

/*************************************************************** GET FRIENDS ********************************************************************/

router.post('/friends', passport.authenticate('basic', {session: false}), function (req, res, next) {
    res.json({friends: req.user.friends});
});


/*************************************************************** GET ACHIEVEMENTS ********************************************************************/

router.post('/achievements/:username', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var usernameToGetAchievements = req.params.username;

    database.getUser(usernameToGetAchievements, {
        success: function (user) {
            res.json({achievements: user.achievements});
        },
        notFound: function () {
            res.status(404);
            res.json({status: 'error', message: 'User not found'});
        },
        error: function (error) {
            res.status(500);
            res.json({status: 'error', message: error});
        }
    });
});


/****************************************************************** UTILITY ********************************************************************/

var crypto = require('crypto');

var generate_key = function () {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};


