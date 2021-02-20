"use strict";
const express = require("express");
let router = express.Router();

const dataAction = require('../modules/dataaction');
const list = require('../controllers/list.controller');

router.use((req, res, next) => {
    console.log(req.url, '@', Date.now());
    next();
});

router
    .route('/:type')
    .get(dataAction.authenticateToken, list.getList)

router
    .route('/:type/:id')
    .get(dataAction.authenticateToken, list.getListOne)

module.exports = router;