var express = require('express');
var hash = require('password-hash');
var app = express();
var server = require('http').Server(app);
var router = express.Router();
var path = require('path');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var mongodb_connection_string = '127.0.0.1:27017/';

var users;
var User = (function () {
    function User(username, password, first_name, last_name, email, token) {
        this.username = username;
        this.password = password;
        this.first_name = first_name;
        this.last_name = last_name;
        this.full_name = first_name + " " + last_name;
        this.email = email;
        this.token = token;
        this.friends = [];
        this.achievements = [];
        this.picture = "";
    }

    return User;
})();

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://' + mongodb_connection_string, function (err, db) {
    if (err) {
        console.log("[DATABASE][ERROR] Failed to connect to MongoDB with connection string: " + mongodb_connection_string);
        throw err;
    }
    users = db.collection('users');
    console.log("[DATABASE][INFO] Connected to MongoDB with connection string: " + mongodb_connection_string);
});


var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy;

passport.use(new Strategy(function (username, token, passport_callback) {

    if (users != undefined) {
        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                console.log("[DATABASE][ERROR]");
                console.log(err);
                passport_callback('error');
                return;
            }
            if (docs === undefined || docs.length === 0) {
                console.log("[DATABASE][VALIDATION][WARNING] User not found: " + username);
                passport_callback(null, false);
                return;
            }
            var user = docs[0];
            if (token === user['token']) {
                console.log("[DATABASE][VALIDATION][INFO] Successfully validated token for user: " + username);
                passport_callback(null, user);
            } else {
                console.log("[DATABASE][VALIDATION][WARNING] Tokens do not match. Failed to validate token for user: " + username);
                passport_callback(null, false);
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        passport_callback('error')
    }
}));


var server_port = 8080;
var server_interface = '0.0.0.0';

server.listen(server_port, server_interface);
console.log("[SERVER][INFO] Nightin-backend server is listening on interface: " + server_interface + ", on port: " + server_port);

app.use(express.static(__dirname + '/public'));

router.use(function (req, res, next) {
    console.log("[" + req.method + "][INFO][" + req.path + "] Requested.");
    next();
});

router.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
    console.log('[GET][TEST][INFO] Test.html is requested');
});

/*********************************************************************************************************************************************/
/*************************************************************** REST API ********************************************************************/
/*********************************************************************************************************************************************/


/*************************************************************** LOGIN ********************************************************************/

router.post('/login', function (req, res, next) {

    var username = req.body.username;
    var password = req.body.password;

    // Rare passwords should not be logged
    console.log('[GET][LOGIN][INFO] Login request with username: ' + username);

    if (users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.status(404); //not found
                res.json({status: "error", message: "User not found!"});
                console.log("[GET][LOGIN][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];
            if (hash.verify(password, user['password'])) {
                var token = generate_key();
                console.log("[GET][LOGIN][INFO] Token generated for user: " + username + ", token:" + token);

                updateUserToken(username, token, res);
            } else {
                res.status(400); //bad request
                res.json({status: "error", message: "Wrong username or password!"});
                console.log("[GET][LOGIN][INFO] Wrong password for the username: " + username);
            }
        });
    } else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }
});

/*************************************************************** RANDOM AUTH ********************************************************************/

router.post('/auth', passport.authenticate('basic', {session: false}), function (req, res, next) {

    res.json({token: req.user.token});
});

/*************************************************************** SIGN UP ********************************************************************/

router.post('/signup', function (req, res, next) {

    var rare = req.body.password;
    var username = req.body.username;
    var email = req.body.email;
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
	
	var items = ['friend1.jpg','friend2.jpg','friend3.jpg','friend4.jpg','friend5.jpg','friend6.jpg','friend7.jpg','friend8.jpg','friend9.jpg','friend10.jpg'];
	var item = items[Math.floor(Math.random()*items.length)];


    if (username === undefined || username === "" ||
        email === undefined || email === "" ||
        first_name === undefined || first_name === "" ||
        last_name === undefined || last_name === "" ||
        rare === undefined || rare === "") {

        console.log('[POST][SIGNUP][WARNING] Invalid form!');
        res.status(400)
        res.json({status: "error", message: "Invalid form!"});
        return;
    }

    var password = hash.generate(rare);

    console.log('[POST][SIGNUP][INFO] Sign up request with username: ' + username + ', email: ' + email);

    if (users != undefined) {
        users.findOne({username: username}, function (err, doc) {
            if (err) {
                console.log("[DATABASE][ERROR] Failed to save user: " + username);
                res.status(500);
                res.json({status: "error", message: "internal"});
            }
            if (doc) {
                console.log('[POST][SIGNUP][INFO] User can not be saved to database, username is already taken: ' + username);
                res.status(409); //conflict
                res.json({status: "error", message: "Username is taken!"});
                return;
            }
            else {
                var user = new User(username, password, first_name, last_name, email, "");
				user.picture = item;

                saveUser(user, res);
            }
        });
    }
    else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
    }
});

app.use('/', router);


/*************************************************************** GET USER ********************************************************************/

router.post('/user/:username', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var usernameToGet = req.params.username;
    var username = req.user.username;
    var token = req.user.token;


    console.log('[POST][USER][INFO] Valid user request: ' + usernameToGet + ', from user: ' + username);

    if (users != undefined) {

        var criteria = {};
        criteria.username = usernameToGet;

        // findOne method is deprecated at the moment
        users.find(criteria, {
            username: 1,
            first_name: 1,
            last_name: 1,
            friends: 1,
            achievements: 1,
            picture: 1
        }).toArray(function (err, docs) {
            if (err) {
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.status(404);
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][USER][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];
            res.json({user: user});
            console.log("[POST][USER][INFO] Requested user found: " + usernameToGet);
            return;
        });
    } else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }

});

router.get('/userimage/:username', function (req, res, next) {

    var usernameToGet = req.params.username;


    console.log('[GET][USERIMAGE][INFO] Valid image request: ' + usernameToGet);

    if (users != undefined) {

        var criteria = {};
        criteria.username = usernameToGet;

        // findOne method is deprecated at the moment
        users.find(criteria, {
            username: 1,
            first_name: 1,
            last_name: 1,
            friends: 1,
            achievements: 1,
            picture: 1
        }).toArray(function (err, docs) {
            if (err) {
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.status(404);
                res.json({status: "error", message: "User not found!"});
                console.log("[GET][USERIMAGE][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];
			console.log('[GET][USERIMAGE] Requested image for user ' + user.username + ' image: ' + user.picture);
			res.sendFile(path.join(__dirname, 'private','user', user.picture));
			
            //res.json({user: user});
            console.log("[GET][USERIMAGE][INFO] Requested user found: " + usernameToGet);
            return;
        });
    } else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }
});

/*************************************************************** ADD FRIEND ********************************************************************/

router.post('/friend/:username', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var usernameToAdd = req.params.username;
    var username = req.user.username;
    var token = req.user.token;


    console.log('[POST][FRIEND][INFO] Valid Request for add user: ' + usernameToAdd + ', to the friends of user: ' + username);

    if (users != undefined) {

        var criteria = {};
        criteria.username = usernameToAdd;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.status(404);
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][FRIEND][WARNING] User not found: " + username);
                return;
            }
            var friend = docs[0];

            criteria.username = username;
            // findOne method is deprecated at the moment
            users.find(criteria).toArray(function (err, docs) {
                if (err) {
                    res.status(500);
                    res.json({status: "error", message: "internal"});
                    console.log("[DATABASE][ERROR]");
                    console.log(err);
                    return;
                }
                if (docs === undefined || docs.length === 0) {
                    res.status(404);
                    res.json({status: "error", message: "User not found!"});
                    console.log("[POST][FRIEND][WARNING] User not found: " + username);
                    return;
                }
                var user = docs[0];

                var isIncluded = false;
                for (var k in user.friends) {
                    if (user.friends[k].username === friend.username) {
                        isIncluded = true;
                    }
                }
                if (user.username === friend.username) {
                    res.status(400);
                    res.json({status: "error", message: "Users are the same!"});
                    console.log("[POST][FRIEND][WARNING] User: " + friend.username + " is same of user: " + user.username);
                    return;
                }
                else if (isIncluded) {
                    res.status(400);
                    res.json({status: "error", message: "Users are already friends!"});
                    console.log("[POST][FRIEND][WARNING] User: " + friend.username + " is already a friend to user: " + user.username);
                    return;
                } else {
                    user.friends.push({username: friend.username, picture: friend.picture});
                    users.updateOne({username: user.username}, {$set: user}, function (err) {
                        if (!err) {
                            res.json({friends: user.friends});
                            console.log("[POST][FRIEND][INFO] User: " + friend.username + " added as friend to user: " + user.username);
                            return;
                        }
                        else {
                            console.log("[DATABASE][ERROR] Failed to save user with added friend: " + user.username);
                            res.status(500);
                            res.json({status: "error", message: "internal"});
                            console.log(err);
                            return;
                        }
                    });
                    return;
                }
            });

            return;
        });
    } else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }

});

/*************************************************************** GET FRIENDS ********************************************************************/

router.post('/friends', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var username = req.user.username;
    var token = req.user.token;


    console.log('[POST][FRIENDS][INFO] Valid Request for get friends of: ' + username);

    if (users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.status(404);
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][FRIEND][WARNING] User not found: " + username);
                return;
            }
            var user = docs[0];
            console.log("[POST][FRIEND][INFO] Friends found of user: " + username);
            res.json({friends: user.friends});
        });
    } else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }

});


/*************************************************************** GET ACHIEVEMENTS ********************************************************************/

router.post('/achievements/:username', passport.authenticate('basic', {session: false}), function (req, res, next) {

    var usernameToGetAchievements = req.params.username;
    var username = req.user.username;
    var token = req.user.token;


    console.log('[POST][ACHIEVEMENTS][INFO] Valid Request for get achievements of: ' + usernameToGetAchievements + ", to: " + username);

    if (users != undefined) {

        var criteria = {};
        criteria.username = usernameToGetAchievements;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.status(404);
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][ACHIEVEMENTS][WARNING] User not found: " + username);
                return;
            }
            var userToGetAchievements = docs[0];
            res.json({achievements: userToGetAchievements.achievements});
            console.log('[POST][ACHIEVEMENTS][INFO] Find achievements of: ' + usernameToGetAchievements + ", to: " + username);
            return;
        });
    } else {
        res.status(500);
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }

});


/****************************************************************** UTILITY ********************************************************************/



function saveUser(User, res) {
    if (users != undefined) {
        users.insert(User, function (err, records) {
            if (!err) {
                console.log("[DATABASE][INFO] Successfully saved user: " + User.username);

                delete User.password;
                res.json(User);
                console.log("[POST][SIGNUP][INFO] User signed up successfully: " + User.username);
            } else {
                console.log("[DATABASE][ERROR] Failed to save user: " + User.username);
                res.status(500);
                res.json({status: "error", message: "internal"});
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        res.status(500);
        res.json({status: "error", message: "internal"});
    }

}

function updateUserToken(username, token, res) {
    if (users != undefined) {
        users.updateOne({username: username}, {$set: {token: token}}, function (err) {
            if (!err) {
                console.log("[DATABASE][INFO] Token updated to user: " + username);
                res.json({token: token});
                console.log("[GET][LOGIN][INFO] User successfully logged in with username: " + username);
            }
            else {
                console.log("[DATABASE][ERROR] Failed to update token to user: " + username);
                res.status(500);
                res.json({status: "error", message: "internal"});
                console.log(err);
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        res.status(500);
        res.json({status: "error", message: "internal"});
    }
}

var crypto = require('crypto');

var generate_key = function () {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};