const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('./config/passport-config');
const users = require('./controllers/userController');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
var http = require('http');
const app = express();

// Define Swagger configuration options
const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'User API Documentation',
      version: '1.0.0',
      description: 'API documentation for user-related functionalities',
    },
  },
  // List of files to be processed
  apis: ['./controllers/userController.js'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Middleware to serve Swagger UI
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Passport middleware
app.use(passport.initialize());

// Db config
const db = require('./config/keys').mongoURI;

// Connect to MongoDB
mongoose
  .connect(db)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Use routes
app.use('/api/users', users);

http.createServer(function (req, res) {
    res.write('Hello World!'); //write a response to the client
    res.end(); //end the response
  }).listen(8080); //the server object listens on port 8080
