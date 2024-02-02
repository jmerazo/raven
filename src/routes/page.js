const { Router } = require('express');
const router = Router();
const cors = require('cors');
const corsOptions = require('../helpers/cors');
/* const userController = require('../controllers/usersController'); */

router.get('/guide', cors(corsOptions), (req, res) => {
    res.render('index');
});

module.exports = router;