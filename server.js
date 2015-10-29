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

var server_port = 8080;
var server_ip_address = '127.0.0.1';
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

app.use('/', router);

/*********************************************************************************************************************************************/
/*************************************************************** REST API ********************************************************************/
/*********************************************************************************************************************************************/


/*************************************************************** LOGIN ********************************************************************/

router.get('/login/:username/:password', function (req, res, next) {

    var username = req.params.username;
    var password = req.params.password;

    loginUser(username, password, res);
});

router.post('/login', function (req, res, next) {
    var username = req.body.data.username;
    var password = req.body.data.password;

    console.log(req.body);

    loginUser(username, password, res);
});


/*************************************************************** RANDOM AUTH ********************************************************************/

router.get('/auth/:username/:token', function (req, res, next) {

    var username = req.params.username;
    var token = req.params.token;

    authUser(username, token, res);
});

router.post('/auth', function (req, res, next) {

    var username = req.body.data.username;
    var token = req.body.data.token;

    authUser(username, token, res);
});


/*************************************************************** SIGN UP ********************************************************************/

router.post('/signup', function (req, res, next) {

    var username = req.body.data.username;
    var rare = req.body.data.password;
    var first_name = req.body.data.first_name;
    var last_name = req.body.data.last_name;
    var email = req.body.data.email;

    signupUser(username, email, first_name, last_name, rare, res);
});


/*************************************************************** GET USER ********************************************************************/

router.post('/user', function (req, res, next) {

    var usernameToGet = req.body.data.username;

    var username = req.body.username;
    var token = req.body.token;

    isValidTokenForUser(username, token, res, function () {

        console.log('[POST][USER][INFO] Valid user request: ' + usernameToGet + ', from user: ' + username);
        getUser(usernameToGet, res);
    });
});

/*************************************************************** ADD FRIEND ********************************************************************/

router.post('/friend', function (req, res, next) {

    var usernameToAdd = req.body.data.username;

    var username = req.body.username;
    var token = req.body.token;


    isValidTokenForUser(username, token, res, function () {
        console.log('[POST][FRIEND][INFO] Valid Request for add user: ' + usernameToAdd + ', to the friends of user: ' + username);
        addFriend(username, usernameToAdd, res);
    });

});

/*************************************************************** GET FRIENDS ********************************************************************/

router.post('/friends', function (req, res, next) {

    var username = req.body.username;
    var token = req.body.token;


    isValidTokenForUser(username, token, res, function () {
        console.log('[POST][FRIENDS][INFO] Valid Request for get friends of: ' + username);
        getFriends(username, res);
    });

});


/*************************************************************** GET ACHIEVEMENTS ********************************************************************/

router.post('/achievements', function (req, res, next) {

    var usernameToGetAchievements = req.body.data.username;

    var username = req.body.username;
    var token = req.body.token;

    isValidTokenForUser(username, token, res, function () {
        console.log('[POST][ACHIEVEMENTS][INFO] Valid Request for get achievements of: ' + usernameToGetAchievements + ", to: " + username);
        getAchievements(usernameToGetAchievements, res);
    });

});


/****************************************************************** UTILITY ********************************************************************/

function getAchievements(usernameToGetAchievements, res) {


    if (users != undefined) {
        var criteria = {};
        criteria.username = usernameToGetAchievements;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][ACHIEVEMENTS][WARNING] User not found: " + usernameToGetAchievements);
                return;
            }
            var userToGetAchievements = docs[0];
            res.json({achievements: userToGetAchievements.achievements});
            console.log('[POST][ACHIEVEMENTS][INFO] Find achievements of: ' + usernameToGetAchievements);
            return;
        });
    } else {
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }
}

function getFriends(username, res) {


    if (users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][FRIEND][WARNING] User not found: " + username);
                return;
            }
            var user = docs[0];
            console.log("[POST][FRIEND][INFO] Friends found of user: " + username);
            res.json({friends: user.friends});
        });
    } else {
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }
}

function addFriend(username, friendToAdd, res) {


    if (users != undefined) {

        var criteria = {};
        criteria.username = friendToAdd;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.json({status: "error", message: "User not found!"});
                console.log("[POST][FRIEND][WARNING] User not found: " + username);
                return;
            }
            var friend = docs[0];

            criteria.username = username;
            // findOne method is deprecated at the moment
            users.find(criteria).toArray(function (err, docs) {
                if (err) {
                    res.json({status: "error", message: "internal"});
                    console.log("[DATABASE][ERROR]");
                    console.log(err);
                    return;
                }
                if (docs === undefined || docs.length === 0) {
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
                var isSame = (user._id === friend._id); //TODO EZ MIÉRT NEM JÓ???
                isSame = user.username === friend.username;

                if (isSame) {
                    res.json({status: "error", message: "User is the same!"});
                    console.log("[POST][FRIEND][WARNING] User: " + friend.username + " is the same of user: " + user.username);
                    return;
                } else if (isIncluded) {
                    res.json({status: "error", message: "Users are already friends!"});
                    console.log("[POST][FRIEND][WARNING] User: " + friend.username + " is already a friend to user: " + user.username);
                    return;
                } else {
                    user.friends.push({username: friend.username, picture: friend.picture});
                    users.updateOne({username: user.username}, {$set: user}, function (err) {
                        if (!err) {
                            res.json({status: "success", message: "Successfully added user as friend!"});
                            console.log("[POST][FRIEND][INFO] User: " + friend.username + " added as friend to user: " + user.username);
                            return;
                        }
                        else {
                            console.log("[DATABASE][ERROR] Failed to save user with added friend: " + user.username);
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
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }


}

function getUser(usernameToGet, res) {

    var response = {status: null, message: null, data: null};


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

                response.status = "error";
                response.message = "internal";

                res.json(response);
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {

                response.status = "error";
                response.message = "User not found!";

                res.json(response);

                console.log("[POST][USER][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];

            response.status = "success";
            response.data = user;

            res.json(response);

            console.log("[POST][USER][INFO] Requested user found: " + usernameToGet);
            return;
        });
    } else {

        response.status = "error";
        response.message = "internal";

        res.json(response);

        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        return;
    }
}

function signupUser(username, email, first_name, last_name, rare, res) {
    if (username === undefined || username === "" ||
        email === undefined || email === "" ||
        first_name === undefined || first_name === "" ||
        last_name === undefined || last_name === "" ||
        rare === undefined || rare === "") {

        console.log('[POST][SIGNUP][WARNING] Invalid form!');
        res.json({status: "error", message: "Invalid form!"});
    }
    else {


        var password = hash.generate(rare);

        console.log('[POST][SIGNUP][INFO] Sign up request with username: ' + username + ', email: ' + email);

        if (users != undefined) {
            users.findOne({username: username}, function (err, doc) {
                if (err) {
                    console.log("[DATABASE][ERROR] Failed to save user: " + username);
                    res.json({status: "error", message: "internal"});
                }
                if (doc) {
                    console.log('[POST][SIGNUP][INFO] User can not be saved to database, username is already taken: ' + username);
                    res.json({status: "error", message: "Username is taken!"});
                }
                else {
                    var user = new User(username, password, first_name, last_name, email, "");

                    saveUser(user, res);
                }
            });
        }
        else {
            res.json({status: "error", message: "internal"});
            console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        }
    }
}

function authUser(username, token, res) {
// Rare passwords should not be logged
    console.log('[GET][AUTH][INFO] Authentication request with username: ' + username + ', token: ' + token);

    if (users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
                res.json({status: "error", message: "User not found!"});
                console.log("[GET][AUTH][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];
            if (token === user['token']) {
                res.json({status: "success", message: "Successfully authenticated user!"});
                console.log("[GET][AUTH][INFO] Successfully authenticated user: " + username);
            } else {
                res.json({status: "error", message: "Not valid token!"});
                console.log("[GET][AUTH][WARNING] Tokens do not match. Failed to authenticate user: " + username);
            }
        });
    } else {
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
    }
}

function loginUser(username, password, res) {
// Rare passwords should not be logged
    console.log('[GET][LOGIN][INFO] Login request with username: ' + username);

    if (users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if (docs === undefined || docs.length === 0) {
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
                res.json({status: "error", message: "Wrong username or password!"});
                console.log("[GET][LOGIN][INFO] Wrong password for the username: " + username);
            }
        });
    } else {
        res.json({status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
    }
}

function saveUser(User, res) {
    if (users != undefined) {
        users.insert(User, function (err, records) {
            if (!err) {
                console.log("[DATABASE][INFO] Successfully saved user: " + User.username);
                res.json({status: "success"});
                console.log("[POST][SIGNUP][INFO] User signed up successfully: " + User.username);
            } else {
                console.log("[DATABASE][ERROR] Failed to save user: " + User.username);
                res.json({status: "error", message: "internal"});
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        res.json({status: "error", message: "internal"});
    }

}

function isValidTokenForUser(username, token, res, success) {

    var response = {status: null, message: null, data: null};

    var error = function () {
        response.status = "error";
        response.message = "Failed to validated token!";

        res.json(response);
    };

    if (users != undefined) {
        var criteria = {};
        criteria.username = username;

        users.find(criteria).toArray(function (err, docs) {
            if (err) {
                console.log("[DATABASE][ERROR]", err);
                error();

            } else if (docs === undefined || docs.length === 0) {
                console.log("[DATABASE][VALIDATION][WARNING] User not found: " + username);
                error();

            } else {
                if (token === docs[0]['token']) {
                    console.log("[DATABASE][VALIDATION][INFO] Successfully validated token for user: " + username);
                    success();

                } else {
                    console.log("[DATABASE][VALIDATION][WARNING] Tokens do not match. Failed to validate token for user: " + username);
                    error();
                }
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        error();
    }
}

function updateUserToken(username, token, res) {
    if (users != undefined) {
        users.updateOne({username: username}, {$set: {token: token}}, function (err) {
            if (!err) {
                console.log("[DATABASE][INFO] Token updated to user: " + username);
                res.json({status: "success", token: token});
                console.log("[GET][LOGIN][INFO] User successfully logged in with username: " + username);
            }
            else {
                console.log("[DATABASE][ERROR] Failed to update token to user: " + username);
                res.json({status: "error", message: "internal"});
                console.log(err);
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        res.json({status: "error", message: "internal"});
    }
}

var crypto = require('crypto');

var generate_key = function () {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};
