/**********************************************************************************************************************/
/** Authorization *****************************************************************************************************/
/**********************************************************************************************************************/

// https://github.com/passport/express-3.x-http-basic-example/blob/master/server.js
// https://github.com/jaredhanson/passport-http


var database = require('./database.js')
var logger = require('./logger');
var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy;

passport.use(new Strategy(function(username, token, passport_callback) {

    database.getUser(username, {
        success: function(user) {
            if (user.token !== token) {
                logger.debug('[Auth] User\'s <%s> tokens are different %s != %s', username, user.token, token);
                passport_callback(null, false);
            } else {
                logger.debug('[Auth] User <%s> authentication succeeded', username);
                passport_callback(null, user);
            }
        },
        notFound: function() {
            logger.debug('[Auth] User <%s> not found', username);
            passport_callback(null, false);
        },
        error: function(error) {
            logger.error('[Auth] Authentication error for user <%s>', username);
            passport_callback('error');
        }
    });
}));

module.exports = passport;