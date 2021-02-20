const dataAction = require('../modules/dataaction');

let hedFile = 'fpohed';
let detFile = 'fpodet';
let logFileHed = 'lpohed';
let logFileDet = 'lpodet';

exports.create = async(req, res) => {
    try {
        let objHed = req.body.poHed;
        let objDet = req.body.poDet;

        let hedQuery = await dataAction.dataPut(hedFile, objHed, req);
        console.log('hedQuery', hedQuery)
        let arrDet = Object.keys(objDet);
        let qStr = [];
        for (let i = 0; i < arrDet.length; i++) {
            delete objDet[arrDet[i]].id;
            objDet[arrDet[i]].pohed = '00000';
            qStr.push(await dataAction.dataPut(detFile, objDet[arrDet[i]]));
        }

        let newPO = await dataAction.executeTransaction(hedQuery, qStr);
        res.json({ code: 'ok', message: 'User successfully saved', recordid: newPO.rows[0].recordid });
    } catch (err) {
        console.log('create error', err.message);
        res.status(500).send({ code: 'error', message: err.message });
    }
}

exports.findAll = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT * FROM listview WHERE recordtype = 'po'`);
        let query = result.rows[0].query;
        result = await dataAction.executeQuery(query);
        res.send(result.rows);
    } catch (err) {
        console.log('findAll error', err.message);
    }
}

exports.findOne = async(req, res) => {
    try {
        let resultHed = await dataAction.executeQuery(`SELECT recordid, refno, manualref, SUBSTRING((CAST(trandate AS TEXT)), 0, 11) trandate, 
            currency, exchangerate, potype, supplier, location, memo, contactperson, addr1, addr2, city, state, zip, 
            SUBSTRING((CAST(expdeldate AS TEXT)), 0, 11) expdeldate, contactnumber FROM ${hedFile} WHERE recordid=${req.params.poid}`);

        let resultDet = await dataAction.executeQuery(`SELECT ROW_NUMBER() OVER (ORDER BY recordid) as id, pohed, item, quantity, purchaseprice, discount, value, 
            tax FROM ${detFile} WHERE pohed = ${req.params.poid} ORDER BY recordid`);

        let data = {};
        data.pohed = resultHed.rows[0];
        data.podet = {};

        for (let i = 0; i < resultDet.rows.length; i++) {
            data.podet[i + 1] = resultDet.rows[i];
        }



        res.json({ code: 'ok', message: 'Data Retrieved Successfully', data: data });
    } catch (err) {
        console.log('findOne error', err.message);
        res.json({ code: 'error', message: err.message });
    }
}


exports.update = async(req, res) => {
    try {
        if (await updLog(req, 'E')) {

            let objHed = req.body.poHed;
            let objDet = req.body.poDet;

            let hedQuery = await dataAction.dataUpd(hedFile, objHed, req.params.poid);

            console.log('hedQuery', hedQuery);

            let arrDet = Object.keys(objDet);
            let qStr = [];
            for (let i = 0; i < arrDet.length; i++) {
                delete objDet[arrDet[i]].id;
                objDet[arrDet[i]].pohed = req.params.poid;
                qStr.push(await dataAction.dataPut(detFile, objDet[arrDet[i]]));
            }

            console.log('qStr', qStr);

            let newPO = await dataAction.executeTransaction(hedQuery, qStr);
            console.log('newPO', newPO);
            res.json({ code: 'ok', message: 'User updated successfully', recordid: req.params.poid });

        }
    } catch (err) {
        console.log('update error', err.message);
        res.json({ code: 'error', message: err.message });
    }
}

exports.delete = async(req, res) => {

    try {
        let result = await _checkTranData(req.params.userid);
        if (result) res.json(result);

        //Delete
        // if (await updLog(req, 'D')) {
        //     let isDeleted = await dataAction.executeQuery(`DELETE FROM ${hedFile} WHERE recordid=${req.params.userid}`);
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
        let result = await dataAction.executeQuery(`SELECT recordid, LEAD(recordid) OVER (ORDER BY recordid ) as nextid FROM ${hedFile}`);
        let groupRes = _groupObj(result.rows, 'recordid');
        res.send({ code: 'ok', message: 'Success', poid: req.params.poid, result: groupRes[req.params.poid] && groupRes[req.params.poid][0] });
    } catch (error) {
        console.log('findCount error', err.message);
        res.send({ code: 'error', message: err.message });
    }
}

exports.findPrev = async(req, res) => {
    try {
        let result = await dataAction.executeQuery(`SELECT recordid, LAG(recordid) OVER (ORDER BY recordid ) as previd FROM ${hedFile}`);
        let groupRes = _groupObj(result.rows, 'recordid');
        res.send({ code: 'ok', message: 'Success', poid: req.params.poid, result: groupRes[req.params.poid] && groupRes[req.params.poid][0] });
    } catch (error) {
        console.log('findCount error', err.message);
        res.send({ code: 'error', message: err.message });
    }
}

const updLog = async(req, logType) => {
    let q1 = (`INSERT INTO lpohed(
        refno, manualref, trandate, currency, exchangerate, potype, supplier, location, 
        memo, contactperson, addr1, addr2, city, state, zip, expdeldate, contactnumber, adddate, 
        adduser, userip, addtimestamp, upduser, upddate, upduserip, updtype, "timestamp", id)
        SELECT refno, manualref, trandate, currency, exchangerate, potype, supplier, location,
        memo, contactperson, addr1, addr2, city, state, zip, expdeldate, contactnumber, adddate,
        adduser, userip, timestamp, ${req.user.userid || ''}, now(), '${req.connection.remoteAddress || '000.000.000'}',
        '${logType}', now(), recordid FROM fpohed WHERE recordid=${req.params.poid};`);


    let q2 = (`INSERT INTO lpodet(id, pohed, item, quantity, purchaseprice, discount, value, tax, bvalue)
        (SELECT recordid, pohed, item, quantity, purchaseprice, discount, value, tax, bvalue from fpodet
        WHERE pohed=${req.params.poid});`);

    let q3 = `DELETE FROM fpodet WHERE pohed=${req.params.poid}`;

    let result = await dataAction.executeQuery([q1, q2, q3]);

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

const _checkTranData = async(userid) => {

    return false;

    // try {
    //     let result = await dataAction.executeQuery(`SELECT table_name FROM information_schema.columns WHERE column_name = 'user'`);
    //     for (let i = 0; i < result.rows.length; i++) {
    //         let db = result.rows[i];
    //         let qres = await dataAction.executeQuery(`SELECT user FROM ${db.table_name} WHERE user='${userid}'`);
    //         if (qres.rows.length) return ({ code: 'error', message: `Unable to delete since it has dependant records` });
    //     }
    //     return false;
    // } catch (error) {
    //     console.log('error _checkMasterData', error);
    //     return { code: 'error', message: error.message }
    // }
}