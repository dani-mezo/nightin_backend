module.exports = function (logger) {

    var MongoClient = require('mongodb').MongoClient;

    var mongodb_connection_string = '127.0.0.1:27017';

    var users;

    MongoClient.connect('mongodb://' + mongodb_connection_string, function (err, db) {
        if (err) {
            logger.error('[Database] Failed to connect to MongoDB with connection string %s', mongodb_connection_string);
            throw err;
        }
        users = db.collection('users');
        logger.info('[Database] Connected to MongoDB at %s', mongodb_connection_string);
    });

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


    function getUser(userName, callback) {
        if (users === undefined) {
            logger.error('[Database] Internal error. Collection users is undefined!');
            callback.error('Database error');
        } else {
            var criteria = {};
            criteria.username = userName;

            users.find(criteria).toArray(function (err, docs) {
                if (err) {
                    logger.error('[Database] Internal database error.', {error: err});
                    callback.error('Database error');
                } else if (docs === undefined || docs.length === 0) {
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
            users.insert(user, function (err, records) {
                if (err) {
                    logger.error('[Database] Failed to save user <%s>', user.username, {error: err});
                    callback.error('Database error');
                } else {
                    logger.info('[Database] Saved user <%s>', user.username);
                    callback.success();
                }
            });
        }
    }

    function addFriendToUser(user, friend, callback) {
        if (user.username === friend.username) {

            logger.warn('[Database] User <%s> is the same of friend <%s>', user.username, friend.username);
            callback.error('Users are the same');

        } else if (user.friends.indexOf(friend.username) >= 0) {

            logger.warn('[Database] User <%s> is already friend of <%s>', friend.username, user.username);
            callback.error('User already has this friend');

        } else {
            user.friends.push({username: friend.username, picture: friend.picture});
            users.updateOne({username: user.username}, {$set: user}, function (err) {
                if (err) {
                    logger.error('[Database] Failed to save user <%s> with added friend <%s>', user.username, friend.username);
                    callback.error('Failed to save user');
                }
                else {
                    logger.debug('[Database] Succeeded to save user <%s> with added friend <%s>', user.username, friend.username);
                    callback.success(user);
                }
            });
        }
    }

    function addFriendNameToUser(user, friendName, callback) {
        getUser(friendName, {
            success: function (friend) {
                addFriendToUser(user, friend, callback);
            },
            notFound: function () {
                logger.warn('Friend <%s> not found', friendName);
                callback.notFound();
            },
            error: function (error) {
                callback.error(error);
            }
        });
    }

    function addFriendNameToUserName(userName, friendName, callback) {
        getUser(userName, {
            success: function (user) {
                addFriendNameToUser(user, friendName, callback);
            },
            notFound: function () {
                logger.warn('User <%s> not found', userName);
                callback.notFound();
            },
            error: function (error) {
                callback.error(error);
            }
        });
    }

    function addTokenToUser(user, token, callback) {
        users.updateOne({username: user.username}, {$set: {token: token}}, function (err) {
            if (err) {
                logger.error('[Database] Failed to update token to user <%s>', user.username, {error: err});
                callback.error('Failed to update token');
            }
            else {
                logger.debug('[Database] Token updated to user <%s>', user.username);
                callback.success();
            }
        });
    }


    return {
        User: User,
        getUser: getUser,
        addUser: addUser,
        addFriendToUser: addFriendToUser,
        addFriendNameToUser: addFriendNameToUser,
        addFriendNameToUserName: addFriendNameToUserName,
        addTokenToUser: addTokenToUser
    };
};