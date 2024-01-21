const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const gravatar = require('gravatar')
const keys = require('../config/keys');
const validateInputs = require('../validators/userValidator');
const validateLoginInput = require('../validators/login')
const User = require('../models/User.js');
const logger = require('../logger/logger');
const passport = require('../config/passport-config');
const mongoose = require('mongoose')
// @route   GET api/users/test
// @desc    Tests users route
// @access  Public
router.get('/test',(req,res) => res.json({msg:"this is working"}))
// @route   GET api/users/register
// @desc    Register user
// @access  Public
router.post('/register', (req, res) => {
    logger.info('Registration request received', { body: req.body });
  
    const { errors, isValid } = validateInputs(req.body);
  
    // Check validation
    if (!isValid) {
      logger.error('Validation failed', { errors });
      return res.status(400).json(errors);
    }
  
    User.findOne({ $or: [{ email: req.body.email }, { mobileNo: req.body.mobileNo }, { userName: req.body.userName }] })
      .then((user) => {
        if (user) {
          if (user.email === req.body.email) {
            errors.email = 'Email already exists';
            logger.error('Registration failed - Email already exists', { errors });
          }
          if (user.mobileNo === req.body.mobileNo) {
            errors.mobileNo = 'Mobile number already exists';
            logger.error('Registration failed - Mobile Number already exists', { errors });
          }
          if (user.userName === req.body.userName) {
            errors.userName = 'Username already exists';
            logger.error('Registration failed - User already exists', { errors });
          }
          
          return res.status(400).json(errors);
        } else {
          const avatar = gravatar.url(req.body.email, {
            s: '200', // size
            r: 'pg',   // rating
            d: 'mm'    // default
          });
  
          const newUser = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastname,
            email: req.body.email,
            mobileNo: req.body.mobileNo,
            password: req.body.password,
            location: req.body.location,
            userName: req.body.userName
          });
  
          logger.info('User created', { newUser });
  
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) {
                logger.error('Password hashing failed', { error: err });
                throw err;
              }
  
              newUser.password = hash;
  
              newUser.save()
                .then(user => {
                  logger.info('User saved successfully', { user });
                  res.json(user);
                })
                .catch(err => {
                  logger.error('User saving failed', { error: err });
                  console.log(err);
                });
            });
          });
        }
      })
      .catch(err => {
        logger.error('User lookup failed', { error: err });
        console.log(err);
      });
  });
// @route   GET api/users/login
// @desc    Login User / Returning JWT Token
// @access  Public
router.post('/login', (req, res, next) => {
    logger.info('Login request received', { body: req.body });
    const { errors, isValid } = validateLoginInput(req.body);
    if (!isValid) {
      logger.error('Validation failed', { errors });
      return res.status(400).json(errors);
    }
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            logger.error('Error during login', { error: err });
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (!user) {
            logger.error('Login failed - User not found', { errors: { email: 'User not found' } });
            return res.status(404).json({ email: 'User not found' });
        }

        // Update the isLoggedIn flag in the database
        user.isLoggedIn = true; // Assuming you have an 'isLoggedIn' field in your user model
        user.save();

        req.login(user, { session: false }, (err) => {
            if (err) {
                logger.error('Error during login', { error: err });
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const payload = { id: user.id, name: user.firstName, avatar: user.avatar }; // Create JWT Payload
            logger.info('payload details',{payload:payload})

            // Sign Token
            jwt.sign(
                payload,
                keys.secretOrKey,
                { expiresIn: 3600 },
                (err, token) => {
                    res.json({
                        success: true,
                        token: 'Bearer ' + token
                    });
                }
            );
        });
    })(req, res, next);
});

router.post('/follow', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { id } = req.user; // Extract the ID of the logged-in user
        const { targetUserId, action } = req.body; // Extract the target user ID and action from the request body

        // Find the logged-in user and the target user in the database
        const user = await User.findById(id);
        const targetUser = await User.findById(targetUserId);

        if (!user || !targetUser) {
          logger.error('User Not Found', { error: err });
            return res.status(404).json({ error: 'User not found' });
            
        }

        // Perform the follow/unfollow action
        if (action === 'follow') {
            // Check if the logged-in user is not already following the target user
            if (!user.following.includes(targetUserId)) {
                user.following.push(targetUserId);
                targetUser.followers.push(id);
            }
        } else if (action === 'unfollow') {
            // Check if the logged-in user is following the target user
            if (user.following.includes(targetUserId)) {
                // Remove targetUserId from the following array of the logged-in user
                user.following = user.following.filter(userId => userId.toString() !== targetUserId);

                // Remove userId from the followers array of the target user
                targetUser.followers = targetUser.followers.filter(userId => userId.toString() !== id);
            } else {
                return res.status(400).json({ error: 'User is not following the target user' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Save the changes to the database
        await user.save();
        await targetUser.save();

        res.json({ message: `User ${action}ed successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/allUsersWithDistance', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
      const loggedInUserId = req.user.id;

      // Get the coordinates of the logged-in user
      const loggedInUser = await User.findById(loggedInUserId);

      if (!loggedInUser || !loggedInUser.location || !loggedInUser.location.coordinates) {
          return res.status(400).json({ error: 'Logged-in user does not have valid coordinates' });
      }

      const [loggedInUserLongitude, loggedInUserLatitude] = loggedInUser.location.coordinates;

      const allUsersWithDistance = await User.aggregate([
          {
              $match: {
                  _id: { $ne: new mongoose.Types.ObjectId(loggedInUserId) }, // Exclude the logged-in user
                  'location.coordinates': { $exists: true }, // Ensure the user has valid coordinates
              },
          },
          {
              $addFields: {
                distance: {
                  $divide: [
                      {
                          $sqrt: {
                              $add: [
                                  {
                                      $pow: [
                                          { $subtract: [{ $arrayElemAt: ['$location.coordinates', 0] }, loggedInUserLongitude] },
                                          2,
                                      ],
                                  },
                                  {
                                      $pow: [
                                          { $subtract: [{ $arrayElemAt: ['$location.coordinates', 1] }, loggedInUserLatitude] },
                                          2,
                                      ],
                                  },
                              ],
                          },
                      },
                      0.009, // Convert radians to kilometers (1 degree of latitude is approximately 111 kilometers)
                  ],
              },
              
              },
          },
          {
              $project: {
                  _id: 1,
                  firstName: 1,
                  lastName: 1,
                  email: 1,
                  userName: 1,
                  location: 1,
                  distance: 1,
              },
          },
      ]);

      res.json({ allUsersWithDistance });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/users/test:
 *   get:
 *     summary: Test route for checking if the user route is working.
 *     description: Returns a JSON response indicating that the route is working.
 *     responses:
 *       200:
 *         description: Success response with a message.
 *         content:
 *           application/json:
 *             example:
 *               msg: this is working
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user.
 *     description: Registers a new user with the application.
 *     parameters:
 *       - in: body
 *         name: user
 *         description: User details for registration.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *               description: The first name of the user.
 *             lastName:
 *               type: string
 *               description: The last name of the user.
 *             email:
 *               type: string
 *               description: The email of the user.
 *             mobileNo:
 *               type: string
 *               description: The mobile number of the user.
 *             password:
 *               type: string
 *               description: The password for the user.
 *             location:
 *               type: object
 *               properties:
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *               description: The coordinates [longitude, latitude] of the user's location.
 *             userName:
 *               type: string
 *               description: The username chosen by the user.
 *           example:
 *             firstName: John
 *             lastName: Doe
 *             email: john.doe@example.com
 *             mobileNo: "1234567890"
 *             password: mysecretpassword
 *             location:
 *               coordinates: [0.0, 0.0]
 *             userName: johndoe
 *     responses:
 *       200:
 *         description: Success response with the registered user.
 *         schema:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *       400:
 *         description: Validation failed or user already exists.
 *         schema:
 *           type: object
 *           properties:
 *             errors:
 *               type: object
 */
/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user and return JWT token.
 *     description: Logs in a user and returns a JWT token for authentication.
 *     parameters:
 *       - in: body
 *         name: loginCredentials
 *         description: Login credentials for the user.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               description: The email of the user.
 *             password:
 *               type: string
 *               description: The password of the user.
 *             rememberMe:
 *               type: boolean
 *               description: Flag to remember the user's session.
 *           example:
 *             email: john.doe@example.com
 *             password: mysecretpassword
 *             rememberMe: true
 *     responses:
 *       200:
 *         description: Success response with a JWT token.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               token: "Bearer eyJhbGciOiJIUzI1NiIsIn..."
 *       400:
 *         description: Validation failed or user not found.
 *         content:
 *           application/json:
 *             example:
 *               errors: { ... }
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal Server Error"
 */
/**
 * @swagger
 * /api/users/follow:
 *   post:
 *     summary: Follow or Unfollow a user.
 *     description: Follows or unfollows a target user based on the specified action.
 *     security:
 *       - jwt: []
 *     parameters:
 *       - in: body
 *         name: targetUserId
 *         schema:
 *           type: string
 *         description: The ID of the target user.
 *         required: true
 *       - in: body
 *         name: action
 *         schema:
 *           type: string
 *         description: The action to perform (follow or unfollow).
 *         required: true
 *     responses:
 *       200:
 *         description: Success response with a message.
 *         content:
 *           application/json:
 *             example:
 *               message: User followed successfully
 *       400:
 *         description: Invalid action or user not found.
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid action or user not found
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             example:
 *               error: Internal Server Error
 */

/**
 * @swagger
 * /api/users/allUsersWithDistance:
 *   get:
 *     summary: Get a list of all users with distances from the logged-in user.
 *     description: Retrieves user data along with distances based on coordinates.
 *     security:
 *       - jwt: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: The longitude of the logged-in user's location.
 *         required: true
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: The latitude of the logged-in user's location.
 *         required: true
 *     requestBody:
 *       description: Additional request body for the API.
 *       required: false
 *       content:
 *         application/json:
 *           example:
 *             key: value
 *     responses:
 *       200:
 *         description: Success response with a list of users and distances.
 *         content:
 *           application/json:
 *             example:
 *               allUsersWithDistance: [ ... ]
 *       400:
 *         description: Logged-in user does not have valid coordinates.
 *         content:
 *           application/json:
 *             example:
 *               error: Logged-in user does not have valid coordinates
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             example:
 *               error: Internal Server Error
 */



  




module.exports = router;