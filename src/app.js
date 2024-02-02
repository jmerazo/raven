var createError = require('http-errors');
var express = require('express');
var debug = require('debug')('myapp:server');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var cors = require('cors');
var morgan = require('morgan');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var flash = require('connect-flash');
var MySQLStore = require('express-mysql-session')(session);

const urls = require('./routes/routes');
const pageUrls = require('./routes/page');
/* const auth = require('./routes/auth'); */

require('dotenv').config();
const conMYSQL2 = require('./db/conn_db');
const sessionStore = new MySQLStore({
  expiration: 10800000,
  createDatabaseTable: true,
}, conMYSQL2);

const app = express();
const port = process.env.PORT || 6633;

app.use(session({
    secret: 'Token-Auth',
    resave: false,
    saveUninitialized: false
}));

app.locals.pluralize = require('pluralize');

// Instala EJS con npm: npm install ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/pdfs', express.static('pdfs'));

app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));// Middleware para analizar datos de formularios
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
}));
/* app.use(csrf()); */

app.use('/api', urls);
app.use('/', pageUrls);
/* app.use('/api-auth', auth); */

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(port);
console.log('API listening in the port: ' + port);