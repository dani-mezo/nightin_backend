
var express = require('express');
var hash = require('password-hash');
var app = express();
var server = require('http').Server(app);
var router = express.Router();
var path = require('path');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
MongoClient.connect('mongodb://'+mongodb_connection_string, function(err, db) {
    if(err) {
        console.log("[DATABASE][ERROR] Failed to connect to MongoDB with connection string: " + mongodb_connection_string);
        throw err;
    }
    users = db.collection('users');
    console.log("[DATABASE][INFO] Connected to MongoDB with connection string: " + mongodb_connection_string);
});

var server_port = 80;
var server_ip_address = '127.0.0.1';
var server_interface = '0.0.0.0';

server.listen(server_port, server_ip_address, server_interface);
console.log("[SERVER][INFO] Nightin-backend server is listening on interface: " + server_interface + ", on port: " + server_port);

app.use(express.static(__dirname + '/public'));

router.use(function(req, res, next) {
    console.log("[" +req.method+"][INFO]["+ req.path+"] Requested.");
    next();
});

router.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname , 'public', 'test.html'));
    console.log('[GET][TEST][INFO] Test.html is requested');
});

/*********************************************************************************************************************************************/
/*************************************************************** REST API ********************************************************************/
/*********************************************************************************************************************************************/


/*************************************************************** LOGIN ********************************************************************/

router.get('/login/:username/:password', function(req, res, next) {

    var username = req.params.username;
    var password = req.params.password;

    // Rare passwords should not be logged
    console.log('[GET][LOGIN][INFO] Login request with username: ' + username);

    if(users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function(err, docs){
            if(err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if(docs === undefined || docs.length === 0){
                res.json({status: "error", message: "User not found!"});
                console.log("[GET][LOGIN][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];
            if(hash.verify(password, user['password'])){
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
        return;
    }
});

/*************************************************************** RANDOM AUTH ********************************************************************/

router.get('/auth/:username/:token', function(req, res, next) {

    var username = req.params.username;
    var token = req.params.token;

    // Rare passwords should not be logged
    console.log('[GET][AUTH][INFO] Authentication request with username: ' + username + ', token: ' + token);

    if(users != undefined) {

        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function(err, docs){
            if(err) {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR]");
                console.log(err);
                return;
            }
            if(docs === undefined || docs.length === 0){
                res.json({status: "error", message: "User not found!"});
                console.log("[GET][AUTH][WARNING] Requested user not found in the database");
                return;
            }
            var user = docs[0];
            if(token === user['token']){
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
        return;
    }
});

/*************************************************************** SIGN UP ********************************************************************/

router.post('/signup', function(req, res, next) {

    var rare = req.body.password;
    var username = req.body.username;
    var email = req.body.email;
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;


    if( username === undefined || username === "" ||
        email === undefined || email === "" ||
        first_name === undefined || first_name === "" ||
        last_name === undefined || last_name === "" ||
        rare === undefined || rare === "") {

        console.log('[POST][SIGNUP][WARNING] Invalid form!');
        res.json({ status: "error", message: "Invalid form!"});
        return;
    }

    var password = hash.generate(rare);

    console.log('[POST][SIGNUP][INFO] Sign up request with username: ' + username + ', email: ' + email);

    if (users != undefined) {
        users.findOne({ username: username }, function (err, doc) {
            if(err){
                console.log("[DATABASE][ERROR] Failed to save user: " + username);
                res.json({ status: "error", message: "internal"});
            }
            if (doc) {
                console.log('[POST][SIGNUP][INFO] User can not be saved to database, username is already taken: ' + username);
                res.json({ status: "error", message: "Username is taken!" });
                return;
            }
            else {
                var user = new User(username, password, first_name, last_name, email, "");

                saveUser(user, res);
            }
        });
    }
    else {
        res.json({ status: "error", message: "internal"});
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
    }
});

app.use('/', router);






/*************************************************************** GET USER ********************************************************************/

router.post('/user/:username', function(req, res, next) {

    var usernameToGet = req.params.username;
    var username = req.body.username;
    var token = req.body.token;

    var call = function(isValid) {
        if(!isValid){
            res.json({status: "error", message: "Failed to validated token!"});
            console.log('[POST][USER][WARNING] NOT valid user request: ' + usernameToGet + ', from user: ' + username);
        } else {

            console.log('[POST][USER][INFO] Valid user request: ' + usernameToGet + ', from user: ' + username);

            if (users != undefined) {

                var criteria = {};
                criteria.username = usernameToGet;

                // findOne method is deprecated at the moment
                users.find(criteria,{username:1, first_name:1, last_name:1, friends:1, achievements:1 , picture:1}).toArray(function (err, docs) {
                    if (err) {
                        res.json({status: "error", message: "internal"});
                        console.log("[DATABASE][ERROR]");
                        console.log(err);
                        return;
                    }
                    if (docs === undefined || docs.length === 0) {
                        res.json({status: "error", message: "User not found!"});
                        console.log("[POST][USER][WARNING] Requested user not found in the database");
                        return;
                    }
                    var user = docs[0];
                    res.json(user);
                    console.log("[POST][USER][INFO] Requested user found: " + usernameToGet);
                    return;
                });
            } else {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
                return;
            }
        }
    }

    isValidTokenForUser(username, token, call);

});

/*************************************************************** ADD FRIEND ********************************************************************/

router.post('/friend/:username', function(req, res, next) {

    var usernameToAdd = req.params.username;
    var username = req.body.username;
    var token = req.body.token;

    var call = function(isValid) {
        if(!isValid){
            res.json({status: "error", message: "Failed to validated token!"});
            console.log('[POST][FRIEND][WARNING] NOT valid Request for add user: ' + usernameToAdd + ', to the friends of user: ' + username);
        } else {

            console.log('[POST][FRIEND][INFO] Valid Request for add user: ' + usernameToAdd + ', to the friends of user: ' + username);

            if (users != undefined) {

                var criteria = {};
                criteria.username = usernameToAdd;

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
                        for(var k in user.friends){
                            if(user.friends[k].username === friend.username){
                                isIncluded = true;
                            }
                        }
                        if(isIncluded){
                            res.json({status: "error", message: "Users are already friends!"});
                            console.log("[POST][FRIEND][WARNING] User: " + friend.username + " is already a friend to user: " + user.username);
                            return;
                        } else {
                            user.friends.push({username: friend.username, picture: friend.picture});
                            users.updateOne({ username: user.username }, { $set: user }, function (err) {
                                if (!err) {
                                    res.json({status: "success", message: "Successfully added user as friend!"});
                                    console.log("[POST][FRIEND][INFO] User: " + friend.username + " added as friend to user: " + user.username);
                                    return;
                                }
                                else {
                                    console.log("[DATABASE][ERROR] Failed to save user with added friend: " + user.username);
                                    res.json({status: "error" , message: "internal"});
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
    }

    isValidTokenForUser(username, token, call);

});

/*************************************************************** GET FRIENDS ********************************************************************/

router.post('/friends', function(req, res, next) {

    var username = req.body.username;
    var token = req.body.token;

    var call = function(isValid) {
        if(!isValid){
            res.json({status: "error", message: "Failed to validated token!"});
            console.log('[POST][FRIENDS][WARNING] NOT valid Request for get friends of: ' + username);
        } else {

            console.log('[POST][FRIENDS][INFO] Valid Request for get friends of: ' + username);

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
    }

    isValidTokenForUser(username, token, call);

});


/*************************************************************** GET ACHIEVEMENTS ********************************************************************/

router.post('/achievements/:username', function(req, res, next) {

    var usernameToGetAchievements = req.params.username;
    var username = req.body.username;
    var token = req.body.token;

    var call = function(isValid) {
        if(!isValid){
            res.json({status: "error", message: "Failed to validated token!"});
            console.log('[POST][ACHIEVEMENTS][WARNING] NOT valid Request for get achievements of: ' + usernameToGetAchievements + ", to: " + username);
        } else {

            console.log('[POST][ACHIEVEMENTS][INFO] Valid Request for get achievements of: ' + usernameToGetAchievements+ ", to: " + username);

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
                        console.log("[POST][ACHIEVEMENTS][WARNING] User not found: " + username);
                        return;
                    }
                    var userToGetAchievements = docs[0];
                    res.json({achievements: userToGetAchievements.achievements});
                    console.log('[POST][ACHIEVEMENTS][INFO] Find achievements of: ' + usernameToGetAchievements+ ", to: " + username);
                    return;
                });
            } else {
                res.json({status: "error", message: "internal"});
                console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
                return;
            }
        }
    }

    isValidTokenForUser(username, token, call);

});


/****************************************************************** UTILITY ********************************************************************/



function saveUser(User, res){
    if (users != undefined) {
        users.insert(User, function (err, records) {
            if (!err) {
                console.log("[DATABASE][INFO] Successfully saved user: " + User.username);
                res.json({status: "success"});
                console.log("[POST][SIGNUP][INFO] User signed up successfully: " + User.username);
            } else {
                console.log("[DATABASE][ERROR] Failed to save user: " + User.username);
                res.json({status: "error" , message: "internal"});
            }
        });
    }else{
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        res.json({status: "error" , message: "internal"});
    }

}

function isValidTokenForUser(username, token, callback){

    if(users != undefined) {
        var criteria = {};
        criteria.username = username;

        // findOne method is deprecated at the moment
        users.find(criteria).toArray(function(err, docs){
            if(err) {
                console.log("[DATABASE][ERROR]");
                console.log(err);
                callback(false);
            }
            if(docs === undefined || docs.length === 0){
                callback(false);
            }
            var user = docs[0];
            if(token === user['token']){
                console.log("[DATABASE][VALIDATION][INFO] Successfully validated token for user: " + username);
                callback(true);
            } else {
                console.log("[DATABASE][VALIDATION][WARNING] Tokens do not match. Failed to validate token for user: " + username);
                callback(false);
            }
        });
    } else {
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        callback(false);
    }
}

function updateUserToken(username, token, res) {
    if (users != undefined) {
        users.updateOne({ username: username }, { $set: { token: token } }, function (err) {
            if (!err) {
                console.log("[DATABASE][INFO] Token updated to user: " + username);
                res.json({status: "success", token: token});
                console.log("[GET][LOGIN][INFO] User successfully logged in with username: " + username);
            }
            else {
                console.log("[DATABASE][ERROR] Failed to update token to user: " + username);
                res.json({status: "error" , message: "internal"});
                console.log(err);
            }
        });
    }else{
        console.log("[DATABASE][ERROR] Collection 'users' is undefined!");
        res.json({status: "error" , message: "internal"});
    }
}

var crypto = require('crypto');

var generate_key = function() {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};
