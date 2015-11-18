process.env['DATABASE_NAME'] = 'TEST';
process.env['LOGGER_CONSOLE'] = false;

var assert = require('assert');
var request = require('supertest');
var tv4 = require('tv4'); //schema validation

var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-subset'));
chai.use(require('chai-json-schema'));

var logger = require('../src/logger.js');
var mongodb = require('../src/database.js');
var app = require('../src/server').app;
var schemas = require('../src/schemas/schemas.js');

var database = null;

function login(user) {
    return request(app)
        .post('/login')
        .send({
            username: user.username,
            password: user.password,
        });
}

function register(user) {
    return request(app)
        .post('/signup')
        .send({
            username: user.username,
            password: user.password,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email
        });
}

function auth(user) {
    return request(app)
        .post('/auth')
        .auth(user.username, user.token)
}

describe('Database', function() {
    it('should connect', function(done) {
        mongodb.on('connect', function(db) {
            database = db;
            done();
        });
    });
});

describe('Register test', function() {

    before(function(done) {
        database.dropDatabase();
        done();
    });

    var a = {
        username: 'a',
        password: 'a',
        first_name: 'a',
        last_name: 'a',
        email: 'a',
        token: null
    };
    var b = {
        username: 'b',
        password: 'b',
        first_name: 'b',
        last_name: 'b',
        email: 'b',
        token: null
    };
    var c = {
        username: 'c',
        password: 'c',
        first_name: 'c',
        last_name: 'c',
        email: 'c',
        token: null
    };

    it('<a> should not login', function(done) {
        login(a).expect(404, done);
    });

    it('<b> should not login', function(done) {
        login(b).expect(404, done);
    });

    it('<c> should not login', function(done) {
        login(c).expect(404, done);
    });

    it('<a> should register user', function(done) {
        register(a)
            .expect(200).end(function(err, res) {
                if (err) return done(err);

                expect(res.body.user).to.be.jsonSchema(schemas.user);
                expect(res.body.user).to.containSubset({
                    username: a.username,
                    first_name: a.first_name,
                    last_name: a.last_name,
                    email: a.email
                });
                done();
            });
    });

    it('<b> should register user', function(done) {
        register(b)
            .expect(200).end(function(err, res) {
                if (err) return done(err);

                expect(res.body.user).to.be.jsonSchema(schemas.user);
                expect(res.body.user).to.containSubset({
                    username: b.username,
                    first_name: b.first_name,
                    last_name: b.last_name,
                    email: b.email
                });
                done();
            });
    });

    it('<c> should register user', function(done) {
        register(c)
            .expect(200).end(function(err, res) {
                if (err) return done(err);

                expect(res.body.user).to.be.jsonSchema(schemas.user);
                expect(res.body.user).to.containSubset({
                    username: c.username,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    email: c.email
                });
                done();
            });
    });

    it('<a> should not register user', function(done) {
        register(a).expect(409, done);
    });

    it('<b> should not register user', function(done) {
        register(b).expect(409, done);
    });

    it('<c> should not register user', function(done) {
        register(c).expect(409, done);
    });
});

describe('Login test', function() {
    before(function(done) {
        database.dropDatabase();
        done();
    });

    var a = {
        username: 'a',
        password: 'a',
        first_name: 'a',
        last_name: 'a',
        email: 'a',
        token: null
    };
    var b = {
        username: 'b',
        password: 'b',
        first_name: 'b',
        last_name: 'b',
        email: 'b',
        token: null
    };
    var c = {
        username: 'c',
        password: 'c',
        first_name: 'c',
        last_name: 'c',
        email: 'c',
        token: null
    };

    var aTokens = [];
    var bTokens = [];
    var cTokens = [];


    it('should not login', function(done) {
        request(app)
            .post('/login')
            .expect(404, done);
    });

    it('<a> should not login', function(done) {
        login(a).expect(404, done);
    });

    it('<b> should not login', function(done) {
        login(b).expect(404, done);
    });

    it('<c> should not login', function(done) {
        login(c).expect(404, done);
    });

    it('<a> should not auth', function(done) {
        request(app)
            .post('/login')
            .auth(a.username, a.password)
            .expect(404, done);
    });

    it('<b> should not auth', function(done) {
        request(app)
            .post('/login')
            .auth(b.username, b.password)
            .expect(404, done);
    });

    it('<c> should not auth', function(done) {
        request(app)
            .post('/login')
            .auth(c.username, c.password)
            .expect(404, done);
    });



    it('<a> should register user', function(done) {
        register(a).expect(200, done);
    });

    it('<b> should register user', function(done) {
        register(b).expect(200, done);
    });

    it('<c> should register user', function(done) {
        register(c).expect(200, done);
    });

    it('<a> should login now', function(done) {
        login(a)
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('token');
                expect(res.body.token).to.be.a('string');

                a.token = res.body.token;
                aTokens.push(res.body.token);

                done();

            });
    });

    it('<b> should login now', function(done) {
        login(b)
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('token');
                expect(res.body.token).to.be.a('string');

                b.token = res.body.token;
                bTokens.push(res.body.token);

                done();

            });
    });

    it('<c> should login now', function(done) {
        login(c)
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('token');
                expect(res.body.token).to.be.a('string');

                c.token = res.body.token;
                cTokens.push(res.body.token);

                done();

            });
    });

    it('<a> should authenticate', function(done) {
        auth(a).expect(200, done);
    });


    it('<b> should authenticate', function(done) {
        auth(b).expect(200, done);
    });

    it('<c> should authenticate', function(done) {
        auth(c).expect(200, done);
    });

    it('<a> should login again', function(done) {
        login(a)
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('token');
                expect(res.body.token).to.be.a('string');

                a.token = res.body.token;
                aTokens.push(res.body.token);

                done();

            });
    });

    it('<b> should login again', function(done) {
        login(b)
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('token');
                expect(res.body.token).to.be.a('string');

                b.token = res.body.token;
                bTokens.push(res.body.token);

                done();

            });
    });

    it('<c> should login again', function(done) {
        login(c)
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('token');
                expect(res.body.token).to.be.a('string');

                c.token = res.body.token;
                cTokens.push(res.body.token);

                done();

            });
    });

    it('<a> should not authenticate', function(done) {
        auth({
            username: a.username,
            token: aTokens[0]
        }).expect(401, done);
    });


    it('<b> should not authenticate', function(done) {
        auth({
            username: b.username,
            token: bTokens[0]
        }).expect(401, done);
    });

    it('<c> should not authenticate', function(done) {
        auth({
            username: c.username,
            token: cTokens[0]
        }).expect(401, done);
    });

    it('<a> should authenticate', function(done) {
        auth({
            username: a.username,
            token: aTokens[1]
        }).expect(200, done);
    });


    it('<b> should authenticate', function(done) {
        auth({
            username: b.username,
            token: bTokens[1]
        }).expect(200, done);
    });

    it('<c> should authenticate', function(done) {
        auth({
            username: c.username,
            token: cTokens[1]
        }).expect(200, done);
    });
});

describe('Add friend test', function() {
    before(function(done) {
        database.dropDatabase();
        done();
    });


});

describe('Add location test', function() {
    before(function(done) {
        database.dropDatabase();
        done();
    });
});