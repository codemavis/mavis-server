"use strict";
const express = require("express");
const app = express();
const port = process.env.port || 5000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

const list = require('./routes/list.routes');

//Master
const user = require('./routes/user.routes');
const location = require('./routes/location.routes');

//Transaction
const po = require('./routes/po.routes');

app.use('/list', list);
app.use('/user', user);
app.use('/location', location);
app.use('/po', po);

app.get('/', (req, res) => {
    //handle root
    res.send("hi root: " + req.connection.remoteAddress);
});

app.listen(port, err => {
    if (err) return console.log("ERROR", err);
    console.log(`Listening on port ${port}`);
});