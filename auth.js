require('dotenv').config();
const client = require('./modules/client');

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');

const dataAction = require('./modules/dataaction');
const user = require('./controllers/user.controller');

const transporter = nodemailer.createTransport(sendGridTransport({
    auth: {
        api_key: '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'
    }
}));

//throw new Error(msg);

app.use(cors());
app.use(express.json());

app.post('/login', async(req, res) => {
    //Authenticate User
    const currUser = await user.findOneByEmail(req.body.email)

    if (currUser == null) return res.status(400).send({
        code: 'ERROR',
        message: 'Unauthorized access'
    });

    try {
        if (await dataAction.compareHash(req.body.password, currUser.password)) {
            //Correct Password 
            const jwtUser = {
                userid: currUser.recordid,
                firstname: currUser.firstname,
                lastname: currUser.lastname,
                email: currUser.email
            };

            const accessToken = generateAccessToken(jwtUser);
            const refreshToken = jwt.sign(jwtUser, process.env.REFRESH_TOKEN_SECRET);

            //Save Refresh Token
            let isSaved = await saveRefreshToken(jwtUser.userid, refreshToken);
            console.log('isSaved', isSaved);

            res.json({
                code: 'OK',
                message: 'Logged in successfully',
                accessToken: accessToken,
                refreshToken: refreshToken
            });
        } else
            res.json({
                code: 'ERROR',
                message: 'Unauthorized Access'
            });
    } catch (error) {
        res.status(500).send({
            code: 'ERROR',
            message: error.message
        });
    }
});

app.listen(4444, err => {
    if (err) return console.log("ERROR", err);
    console.log(`Listening on port ${4444}`);
});

const generateAccessToken = (currUser) => {
    return jwt.sign(currUser, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' }); //15s
}

app.post('/token', async(req, res) => {
    const refreshToken = req.body.token;
    if (refreshToken == null) return res.sendStatus(401);

    //Check with active refresh tokens
    let isAvailable = await checkRefreshToken(refreshToken);
    if (!isAvailable) return res.status(403).send({ code: 'ERROR', message: 'Invalid Refresh Token' });

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, currUser) => {
        if (err) return res.sendStatus(403);

        //  const accessToken = generateAccessToken({ name: user.name });
        const accessToken = generateAccessToken(currUser);
        res.json({ code: 'OK', message: 'Success', accessToken: accessToken });
    });
});

app.delete('/logout', async(req, res) => {

    try {
        let result = await client.query(`UPDATE authuser SET isactive=false WHERE refreshtoken='${req.body.token}'`);
        console.log('result', result);
        res.json({ code: 'OK', message: 'Success', logout: true });
    } catch (err) {
        console.log('logout error', err.message);
        res.json({ code: 'ERROR', message: 'Fail', logout: true });
    }


});

const checkRefreshToken = async(refreshToken) => {
    try {
        let result = await client.query(`SELECT recordid,user FROM authuser WHERE refreshtoken='${refreshToken}' AND isactive=true`);
        console.log('result.rows.rowCount', result.rows.length);
        return result.rows.length;

    } catch (err) {
        console.log('findAll error', err.message);
    }
    return null;
}

const saveRefreshToken = async(userId, refreshToken) => {
    try {
        let result = await client.query(`INSERT INTO authuser("user", refreshtoken, isactive) VALUES (${userId}, '${refreshToken}', true)`);
        console.log('result.rows', result.rows);
        return result.rows;
    } catch (err) {
        console.log('findAll error', err.message);
    }
}

app.post('/reset', async(req, res) => {

    crypto.randomBytes(32, async(err, buffer) => {
        if (err) console.log('crypto err', err.message);

        const token = buffer.toString("hex");
        const expireToken = 100; //Date.now() + 1000;

        try {

            const currUser = await user.findOneByEmail(req.body.email);

            if (!currUser) res.json({ code: 'ERROR', message: 'Invalid Email Address' });

            let result = await client.query(`UPDATE user SET resettoken='${token}', expiretoken=${expireToken} WHERE email = '${req.body.email}'`);
            console.log('result.rows', result.rows);
            if (result.rows) {

                transporter.sendMail({
                    to: 'sathasivam.sujee@gmail.com', //req.body.email,
                    from: 'sathasivam.sujee@gmail.com',
                    subject: '[WeddingDeals.lk] Please reset your password',
                    html: `<p>We heard that you lost your WeddingDeals.lk password. Sorry about that!</p>
                    <br/>
                    <p>But don’t worry! You can use the following link to reset your password:</p>
                    <br/>
                    <p>http://localhost:3000/password_reset/${token}</p>
                    <br/>
                    <p>If you don’t use this link within 3 hours, it will expire. To get a new password reset link, visit http://localhost:3000/password_reset</p>
                    <br/>
                    <br/>
                    <p>Thanks,</p>
                    <p>The GitHub Team</p>`
                }).then(() => {
                    res.json({ code: 'OK', message: 'Email Sent' });
                }).catch((error) => {
                    res.json({ code: 'ERROR', message: error.message });
                });


            }


        } catch (error) {
            res.json({ code: 'OK', message: error.message });
        }
    });


});