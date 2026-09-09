const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.hiwsirtajrvvjpfirhzb:simonHasntRoom@aws-0-eu-west-3.pooler.supabase.com:6543/postgres' });
client.connect()
  .then(() => { console.log('Connected!'); client.end(); })
  .catch(err => { console.error('Connection error', err.message); });
