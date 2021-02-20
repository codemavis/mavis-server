"use strict";
const express = require("express");
let router = express.Router();

const dataAction = require('../modules/dataaction');
const po = require('../controllers/po.controller');

router.use((req, res, next) => {
    console.log(req.url, '@', Date.now());
    next();
});

router
    .route('/')
    .get(dataAction.authenticateToken, po.findAll)
    .post(dataAction.authenticateToken, po.create);

router
    .route('/next/:poid')
    .get(dataAction.authenticateToken, po.findNext)

router
    .route('/prev/:poid')
    .get(dataAction.authenticateToken, po.findPrev)

router
    .route('/:poid')
    .get(dataAction.authenticateToken, po.findOne)
    .put(dataAction.authenticateToken, po.update)
    .delete(dataAction.authenticateToken, po.delete);



module.exports = router;