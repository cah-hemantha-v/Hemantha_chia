//logic to be writted for fetching UID based on logged in user.

var request = require("request");

function getUserInfo(host, token) {
    var options = {
        method: 'GET',
        url: 'https://' + host + '/oauth2/v1/userinfo',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Host': host,
            'Cache-Control': 'no-cache',
            'Accept': '*/*',
            'Authorization': token
        }
    };
    console.log(`options..`);
    console.log(options);
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            try {
                if (!error) {
                    console.log(body);
                    resolve(body);
                } else {
                    console.error(new Error(`Error with Okta user info -- ${error}`));
                    reject(error);
                }
            } catch (error) {
                console.error(new Error(error));
                reject(error);
            }
        });
    });

}

module.exports = getUserInfo