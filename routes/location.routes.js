"use strict";
const express = require("express");
let router = express.Router();

const dataAction = require('../modules/dataaction');
const location = require('../controllers/location.controller');

router.use((req, res, next) => {
    console.log(req.url, '@', Date.now());
    next();
});

router
    .route('/')
    .get(dataAction.authenticateToken, location.findAll)
    .post(dataAction.authenticateToken, location.create);

router
    .route('/next/:locid')
    .get(dataAction.authenticateToken, location.findNext)

router
    .route('/prev/:locid')
    .get(dataAction.authenticateToken, location.findPrev)

router
    .route('/:locid')
    .get(dataAction.authenticateToken, location.findOne)
    .put(dataAction.authenticateToken, location.update)
    .delete(dataAction.authenticateToken, location.delete);

router
    .route('/supervisors/:locid')
    .get(dataAction.authenticateToken, location.findSupervisors)

module.exports = router;