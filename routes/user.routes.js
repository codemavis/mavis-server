"use strict";
const express = require("express");
let router = express.Router();

const dataAction = require('../modules/dataaction');
const user = require('../controllers/user.controller');

router.use((req, res, next) => {
    console.log(req.url, '@', Date.now());
    next();
});

router
    .route('/')
    .get(dataAction.authenticateToken, user.findAll)
    .post(dataAction.authenticateToken, user.create);

router
    .route('/curruser')
    .get(dataAction.authenticateToken, user.findCurrent)

router
    .route('/next/:userid')
    .get(dataAction.authenticateToken, user.findNext)

router
    .route('/prev/:userid')
    .get(dataAction.authenticateToken, user.findPrev)

router
    .route('/role')
    .get(dataAction.authenticateToken, user.findRoles)

router
    .route('/role/:roleid')
    .get(dataAction.authenticateToken, user.findRoleById)

router
    .route('/:userid')
    .get(dataAction.authenticateToken, user.findOne)
    .put(dataAction.authenticateToken, user.update)
    .delete(dataAction.authenticateToken, user.delete);

router
    .route('/supervisors/:userid')
    .get(dataAction.authenticateToken, user.findSupervisors)

router
    .route('/supervisor/:supervisorid')
    .get(dataAction.authenticateToken, user.findSupervisorById)

router
    .route('/email/:emailid')
    .get(user.findOneByEmail) //For login

module.exports = router;