const express = require('express'); //import express
const router = express.Router(); //creates instance of express router 

// basic API route for testing purposes
router.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

// please add more routes here

module.exports = router;