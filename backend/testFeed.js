const admin = require('firebase-admin');
const axios = require('axios');
const serviceAccount = require('./backend/kammnow-ac625-firebase-adminsdk-yex46-8884d5df68.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function test() {
  try {
    const token = await admin.auth().createCustomToken('test_user_id');
    const res = await axios.get('http://192.168.29.144:3000/api/jobs/feed?lat=17.4344&lon=78.4497', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
