var logger = require('./logger.js');

var self = this;

var MongoClient = require('mongodb').MongoClient;

var databaseUrl = '127.0.0.1:27017';
var databaseName = (process.env.hasOwnProperty('DATABASE_NAME')) ? process.env['DATABASE_NAME'] : 'MAIN';
var database = null;
var users = null;
var listeners = {};

function on(trigger, callback) {
    if (!(trigger in listeners)) {
        listeners[trigger] = [];
    }
    listeners[trigger].push(callback);
}

MongoClient.connect('mongodb://' + databaseUrl + '/' + databaseName, function(err, db) {
    if (err) {
        logger.error('[Database] Failed to connect to MongoDB with connection string %s', databaseUrl);
        throw err;
    }

    database = db;
    users = db.collection('users');
    logger.info('[Database] Connected to MongoDB at %s', databaseUrl);

    if ('connect' in listeners) {
        for (var listener of listeners['connect']) {
            listener.call(null, db);
        }
    }
});

var User = (function() {
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
        this.location = null;
    }

    return User;
})();


function getUser(userName, callback) {
    if (users === undefined) {
        logger.error('[Database] Internal error. Collection users is undefined!');
        callback.error('Database error');
    } else {
        var criteria = {};
        criteria.username = userName;

        users.find(criteria).toArray(function(err, docs) {
            if (err) {
                logger.error('[Database] Internal database error.', {
                    error: err
                });
                callback.error('Database error');
            } else if (docs.length === 0) {
                logger.debug('[Database] User <%s> not found', userName);
                callback.notFound();
            } else {
                callback.success(docs[0]);
            }
        });
    }
}

function addUser(user, callback) {
    if (users === undefined) {
        logger.error('[Database] Internal error. Collection users is undefined!');
        callback.error('Database error');
    } else {
        users.insert(user, function(err, records) {
            if (err) {
                logger.error('[Database] Failed to save user <%s>', user.username, {
                    error: err
                });
                callback.error('Database error');
            } else {
                logger.info('[Database] Saved user <%s>', user.username);
                callback.success();
            }
        });
    }
}

function addFriendToUser(_user, _friend, callback) {

    getMoreUser({
        success: function(user, friend) {

            console.log(user, friend);

            if (user.username === friend.username) {

                logger.warn('[Database] User <%s> is the same of friend <%s>', user.username, friend.username);
                callback.error('Users are the same');

            } else if (user.friends.indexOf(friend.username) >= 0) {

                logger.warn('[Database] User <%s> is already friend of <%s>', friend.username, user.username);
                callback.error('User already has this friend');

            } else {
                user.friends.push({
                    username: friend.username,
                    picture: friend.picture
                });
                users.updateOne({
                    username: user.username
                }, {
                    $set: user
                }, function(err) {
                    if (err) {
                        logger.error('[Database] Failed to save user <%s> with added friend <%s>', user.username, friend.username);
                        callback.error('Failed to save user');
                    } else {
                        logger.debug('[Database] Succeeded to save user <%s> with added friend <%s>', user.username, friend.username);
                        callback.success(user);
                    }
                });
            }
        },
        notFound: callback.notFound,
        error: callback.error
    }, _user, _friend);
}

function getUsers(callback, username1, username2) {
    var argList = Array.prototype.slice.call(arguments).slice(1);
    var argStringList = [];
    var criteria = {
        '$or': []
    };

    for (var i = 0; i < argList.length; ++i) {
        if (argList[i] instanceof Object) {
            argStringList = argList[i].username;
        } else if (typeof argList[i] === "string") {
            argStringList = argList[i];
        }
    }

    for (var i = 0; i < argStringList.length; ++i) {
        criteria['$or'].push({
            'username': argStringList[i]
        });
    }

    users.find(criteria).toArray(function(err, arr) {
        if (err) {
            callback.error(err);
            return;
        }

        if (arr.length !== argStringList.length) {
            logger.warn('User not found');
            callback.notFound();
            return;
        }

        var result = new Array(argStringList.length);
        for (var i = 0; i < arr.length; ++i) {
            //sort in the same order, which arguments was
            result[argStringList.indexOf(arr[i].username)] = arr[i];
        }

        callback.success.apply(self, result);
    });
}

function getMoreUser(callback, userName1, userName2) {
    return getUsers.apply(self, arguments);

    /*var callback = arguments[0];
    var users = [];
    var userList = Array.prototype.slice.call(arguments).slice(1);

    function next() {
        if(userList.length === 0) {

            callback.success.apply(self, users);
            return;
        }

        var usernameToGet = userList[0];

        if(usernameToGet instanceof Object) {
            users.push(usernameToGet);
            userList.shift();
            next();

        } else {

            getUser(usernameToGet, {
                success: function (user) {
                    users.push(user);
                    userList.shift();
                    next();
                },
                notFound: function () {
                    logger.warn('User <%s> not found', usernameToGet);
                    callback.notFound();
                },
                error: function (error) {
                    callback.error(error);
                }
            });
        }
    }

    next();*/
}

function addTokenToUser(user, token, callback) {
    users.updateOne({
        username: user.username
    }, {
        $set: {
            token: token
        }
    }, function(err) {
        if (err) {
            logger.error('[Database] Failed to update token to user <%s>', user.username, {
                error: err
            });
            callback.error('Failed to update token');
        } else {
            logger.debug('[Database] Token updated to user <%s>', user.username);
            callback.success();
        }
    });
}

function addLocationToUser(user, location, callback) {
    users.updateOne({
        username: user.username
    }, {
        $set: {
            location: location
        }
    }, function(err) {
        if (err) {
            logger.error('[Database] Failed to update location to user <%s>', user.username, {
                error: err
            });
            callback.error('Failed to update location');
        } else {
            logger.debug('[Database] Location updated to user <%s>', user.username);
            user.location = location;
            callback.success(user);
        }
    });
}


module.exports = {
    User: User,
    getUser: getUser,
    getMoreUser: getMoreUser,
    addUser: addUser,
    addFriendToUser: addFriendToUser,
    addTokenToUser: addTokenToUser,
    addLocationToUser: addLocationToUser,
    database: database,
    on: on
};