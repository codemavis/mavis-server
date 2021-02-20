const dataAction = require('../modules/dataaction');
const client = require('../modules/client');

let dataFile = 'flist';

exports.getList = async(req, res) => {
    try {
        let result;
        switch (req.params.type) {
            case 'state':
                result = await client.query(`SELECT recordid as value, statecode as code, statedesc as text FROM fstate WHERE isactive=true`);
                result = result.rows;
                break;

            default:
                result = [];
                break;
        }

        res.json({ code: 'ok', data: result });
    } catch (err) {
        console.log('findAll error', err.message);
        res.json({ code: 'error', message: err.message });
    }
}

exports.getListOne = async(req, res) => {
    try {
        let result;
        switch (req.params.type) {
            case 'state':
                result = await client.query(`SELECT recordid as value, statecode as code, statedesc as text FROM fstate WHERE isactive=true AND recordid=${req.params.id}`);
                result = result.rows.length ? result.rows[0] : {};
                break;

            default:
                result = [];
                break;
        }

        res.json({ code: 'ok', data: result });
    } catch (err) {
        console.log('findAll error', err.message);
        res.json({ code: 'error', message: err.message });
    }
}