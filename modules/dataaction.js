require('dotenv').config();
const express = require("express");
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../modules/client');

app.use(express.json())

exports.dataPut = async(fileName, dataObj, req = '') => {

    let keys = '';
    let values = '';

    Object.keys(dataObj).map((x) => {
        keys += `,${x}`;
        values += typeof(dataObj[x]) == 'string' ? `,'${dataObj[x]}'` : `,${dataObj[x]}`;
    })

    if (req) {
        keys += ',adddate, adduser, userip, timestamp';
        values += `,now(), ${req.user.userid || ''}, '${req.connection.remoteAddress || '000.000.000'}', now()`;
    }


    keys = keys.replace(',', '');
    values = values.replace(',', '');

    console.log('keys', keys);
    console.log('values', values);

    return `INSERT INTO ${fileName} (${keys}) VALUES (${values}) RETURNING *`; // 
}

exports.dataUpd = async(fileName, dataObj, recId) => {

    let key = '';
    let value = '';
    let str = '';

    Object.keys(dataObj).map((x) => {
        key = `${x}`;
        value = typeof(dataObj[x]) == 'string' ? `'${dataObj[x]}'` : `${dataObj[x]}`;
        str += `, ${key}=${value}`;
    });

    str = str.replace(', ', '');

    return `UPDATE ${fileName} SET ${str} WHERE recordid = ${recId}`;
}

exports.hashStr = async(str) => {
    //  salt = salt || await bcrypt.genSalt();
    let salt = await bcrypt.hash(str, 10);
    console.log('salt', salt);
    return salt;
}

exports.compareHash = async(str, compStr) => {
    console.log('str', str);
    console.log('compStr', compStr);
    try {
        if (await bcrypt.compare(str, compStr))
            return true;
        else
            return false;
    } catch (error) {
        console.log('error', error);
    }
}

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('authHeader', authHeader)
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).send({ code: 'ERROR', message: 'Unauthorized user, invalid token' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.send({ code: 'ERROR', message: 'Token not verified' }); //.sendStatus(403)
        req.user = user;
        next();
    });
}

exports.executeQuery = async(query) => {

    const client = await pool.connect()
    let result;
    try {
        await client.query('BEGIN')

        if (typeof(query) === "string") {
            result = await client.query(query);
            console.log('result1', result);
        } else {
            for (let i = 0; i < query.length; i++) {
                result = await client.query(query[i]);
                console.log('result2', result);
            }
        }
        await client.query('COMMIT');

        return result;
    } catch (error) {
        await client.query('ROLLBACK')
        return error;
    } finally {
        client.release()
    }
}

exports.executeTransaction = async(hedQuery, detQuery) => {

    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        console.log('hedQuery hedQuery hedQuery', hedQuery);
        let hedRes = await client.query(hedQuery);

        if (hedRes.rows[0] && hedRes.rows[0].recordid) {
            let detRes = [];
            for (let i = 0; i < detQuery.length; i++) {
                detQuery[i] = detQuery[i].replace('00000', hedRes.rows[0].recordid);
                detRes.push(await client.query(detQuery[i]));
            }
        } else {
            let detRes = [];
            for (let i = 0; i < detQuery.length; i++) {
                detRes.push(await client.query(detQuery[i]));
            }
        }

        await client.query('COMMIT');

        return hedRes;
    } catch (error) {
        console.log('error error', error);
        await client.query('ROLLBACK')
        return error;
    } finally {
        client.release()
    }

}