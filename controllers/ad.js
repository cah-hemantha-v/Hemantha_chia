var ActiveDirectory = require('activedirectory');

var config = {
    url: 'ldap://10.226.41.70',
    baseDN: 'dc=cardinalhealth,dc=net',
    username: 'arunanand.karunakaran@cardinalhealth.com',
    password: 'TEST'
}

var ad = new ActiveDirectory(config);

ad.findUser('arunanand.karunakaran@cardinalhealth.com', function(err, user) {
    if (err) {
      console.log('ERROR: ' +JSON.stringify(err));
      return;
    }
   
    if (! user) console.log('User: ' + 'arunanand.karunakara' + ' not found.');
    else console.log(JSON.stringify(user));
  });