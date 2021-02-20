const dataAction = require('../modules/dataaction');
//const client = require('../modules/client');

let dataFile = 'fuser';
let logFile = 'luser';

exports.create = async(req, res) => {
    try {
        let objUser = req.body;
        console.log('objUser.password', objUser.password);
        objUser.password = await dataAction.hashStr(objUser.password);

        let qStr = await dataAction.dataPut(dataFile, objUser, req);
        let newUser = await dataAction.executeQuery(qStr);
        res.json({ code: 'ok', message: 'User successfully saved', recordid: newUser.rows[0].recordid });
    } catch (err) {
        console.log('create error', err.message);
        res.status(500).send({ code: 'error', message: err.message });
    }
}

exports.findAll = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT * FROM listview WHERE recordtype = 'location'`);
        let query = result.rows[0].query;
        result = await dataAction.executeQuery(query);
        res.json({ code: 'ok', message: 'Retrieved Successfully', data: result.rows });
    } catch (err) {
        console.log('findAll error', err.message);
        res.json({ code: 'error', message: err.message });
    }
}

exports.findOne = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid, username, bio, userid, jobtitle, firstname, 
        lastname, supervisor, email, phone, mobile, addr1, addr2, city, state, zip, giveaccess, 
        userrole, '' AS password FROM ${dataFile} WHERE recordid = ${req.params.userid}`);
        res.send(result.rows[0]);
    } catch (err) {
        console.log('findOne error', err.message);
    }
}

exports.findOneByEmail = async(email) => {
    try {
        let result = await dataAction.executeQuery(`SELECT * FROM ${dataFile} WHERE email = '${email}'`);
        return await result.rows[0];
    } catch (err) {
        console.log('findOneByEmail error', err.message);
        return err.message;
    }
}

exports.update = async(req, res) => {
    try {
        if (await updLog(req, 'E')) {
            req.body.password = await dataAction.hashStr(req.body.password);
            let qStr = await dataAction.dataUpd(dataFile, req.body, req.params.userid);
            let updUser = await dataAction.executeQuery(qStr);
            res.json({ code: 'ok', message: `${updUser.rowCount} row/s affected` });
        }
    } catch (err) {
        console.log('update error', err.message);
        res.json({ code: 'error', message: err.message });
    }
}

exports.delete = async(req, res) => {

    try {
        let result = await _checkMasterData(req.params.userid);
        if (result) res.json(result);

        //Delete
        // if (await updLog(req, 'D')) {
        //     let isDeleted = await dataAction.executeQuery(`DELETE FROM ${dataFile} WHERE recordid=${req.params.userid}`);
        //     if (isDeleted.rowCount) {
        //         res.json({ code: 'ok', message: 'Deleted Successfully' });
        //     }
        // }

        res.json({ code: 'ok', message: 'Deleted Successfully' }); //Delete later

        res.json({ code: 'error', message: 'Unable to delete, please contact administrator' });
    } catch (error) {
        res.json({ 'error': error, message: error.message });
    }

}

exports.findCurrent = (req, res) => {
    try {
        console.log('req.user', req.user);
        res.send({ code: 'ok', message: 'Success', user: req.user });
    } catch (error) {
        console.log('findCurrent error', err.message);
        res.send({ code: 'error', message: err.message, user: null });
    }
}

exports.findNext = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid, LEAD(recordid) OVER (ORDER BY recordid ) as nextid FROM fuser`);
        let groupRes = _groupObj(result.rows, 'recordid');
        res.send({ code: 'ok', message: 'Success', userid: req.params.userid, result: groupRes[req.params.userid] && groupRes[req.params.userid][0] });
    } catch (error) {
        console.log('findCount error', err.message);
        res.send({ code: 'error', message: err.message });
    }
}

exports.findPrev = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid, LAG(recordid) OVER (ORDER BY recordid ) as previd FROM fuser`);
        let groupRes = _groupObj(result.rows, 'recordid');
        res.send({ code: 'ok', message: 'Success', userid: req.params.userid, result: groupRes[req.params.userid] && groupRes[req.params.userid][0] });
    } catch (error) {
        console.log('findCount error', err.message);
        res.send({ code: 'error', message: err.message });
    }
}

exports.findSupervisors = async(req, res) => {
    try {
        // let result = await dataAction.executeQuery(`SELECT recordid as value, CONCAT(firstname,' ', lastname) as text FROM fuser where recordid <> ${req.params.userid}`);
        let result = await dataAction.executeQuery(`SELECT recordid as value, CONCAT(firstname,' ', lastname) as text FROM fuser where recordid <> ${req.params.userid}`);
        res.json({ code: 'ok', data: result.rows })
    } catch (error) {
        console.log('error findSupervisors', error);
        return { code: 'error', message: error.message }
    }
}

exports.findSupervisorById = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid as value, CONCAT(firstname,' ', lastname) as text FROM fuser where recordid = ${req.params.supervisorid}`);
        res.json({ code: 'ok', data: result.rows.length > 0 ? result.rows[0] : {} })
    } catch (error) {
        console.log('error findSupervisorById', error);
        return { code: 'error', message: error.message }
    }
}

exports.findRoles = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid AS value, role AS text FROM frole WHERE isactive=true`);
        res.json({ code: 'ok', data: result.rows })
    } catch (error) {
        console.log('error findSupervisors', error);
        return { code: 'error', message: error.message }
    }
}

exports.findRoleById = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid AS value, role AS text FROM frole WHERE isactive=true AND recordid=${req.params.roleid}`);
        res.json({ code: 'ok', data: result.rows.length > 0 ? result.rows[0] : {} })
    } catch (error) {
        console.log('error findSupervisors', error);
        return { code: 'error', message: error.message }
    }
}

const updLog = async(req, logType) => {
    let result = await dataAction.executeQuery(`INSERT INTO ${logFile}(
        id, username, bio, userid, jobtitle, firstname, lastname, supervisor, 
        email, phone, mobile, addr1, addr2, city, state, zip, password, giveaccess, userrole, adddate, 
        adduser, adduserip, addtimestamp, upduser, upddate, upduserip, updtype, "timestamp")
        SELECT recordid, username, bio, userid, jobtitle, firstname, lastname, supervisor, 
        email, phone, mobile, addr1, addr2, city, state, zip, password, giveaccess, userrole, adddate, adduser, userip, timestamp, 
        ${req.user.userid || ''} , now(), '${req.connection.remoteAddress || '000.000.000'}', 
        '${logType}', now() FROM fuser WHERE recordid=${req.params.userid};`);

    if (result.rowCount > 0)
        return true;
    return false;
}

const _groupObj = (list, groupFld) => {
    // var cars = [{ make: 'audi', model: 'r8', year: '2012' }, { make: 'audi', model: 'rs5', year: '2013' }, { make: 'ford', model: 'mustang', year: '2012' }, { make: 'ford', model: 'fusion', year: '2015' }, { make: 'kia', model: 'optima', year: '2012' }],
    result = list.reduce(function(r, a) {
        r[a[groupFld]] = r[a[groupFld]] || [];
        r[a[groupFld]].push(a);
        return r;
    }, Object.create(null));

    return result;
}

const _checkMasterData = async(userid) => {

    try {
        let result = await dataAction.executeQuery(`SELECT table_name FROM information_schema.columns WHERE column_name = 'user'`);
        for (let i = 0; i < result.rows.length; i++) {
            let db = result.rows[i];
            let qres = await dataAction.executeQuery(`SELECT user FROM ${db.table_name} WHERE user='${userid}'`);
            if (qres.rows.length) return ({ code: 'error', message: `Unable to delete since it has dependant records` });
        }
        return false;
    } catch (error) {
        console.log('error _checkMasterData', error);
        return { code: 'error', message: error.message }
    }
}