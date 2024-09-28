// <=====[ Webpage Handling ]=====>

// HTML files:
//   - Files like 'index.html' and 'dashboard.html', inside the 'public/dist' directory.
//     Example: 'public/dist/index.html' and 'public/dist/dashboard.html'.

// CSS files:
//   - Inside the 'public/dist' directory for production-ready styles.
//   - (Can also use 'public/src' if you are managing source styles separately.)
//     Example: 'public/dist/styles.css' or 'public/src/styles.css'.

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use('/css', express.static(path.join(__dirname, 'public', 'dist')));
router.use('/css', express.static(path.join(__dirname, 'public', 'src')));

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.USERNAME && password === process.env.PASSWORD) {
    res.redirect('/dashboard');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dist', 'index.html'));
});

router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dist', 'dashboard.html'));
});

module.exports = router;