// Test Porkbun API access
const PORKBUN_API_KEY = process.env.PORKBUN_API_KEY;
const PORKBUN_SECRET_KEY = process.env.PORKBUN_SECRET_KEY;
const TEST_EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN;

console.log('Testing Porkbun API access...\n');

async function testPorkbunAPI() {
  // Test 1: Ping API
  console.log('Test 1: Pinging Porkbun API...');
  try {
    const pingResponse = await fetch('https://api.porkbun.com/api/json/v3/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretapikey: PORKBUN_SECRET_KEY,
        apikey: PORKBUN_API_KEY,
      }),
    });

    const pingData = await pingResponse.json();
    if (pingData.status === 'SUCCESS') {
      console.log('✅ API ping successful!');
      console.log('   Response:', pingData);
    } else {
      console.log('❌ API ping failed:', pingData);
      return;
    }
  } catch (error) {
    console.error('❌ Error pinging API:', error.message);
    return;
  }

  // Test 2: Retrieve DNS records for domain
  console.log(`\nTest 2: Retrieving DNS records for ${TEST_EMAIL_DOMAIN}...`);
  try {
    const dnsResponse = await fetch(`https://api.porkbun.com/api/json/v3/dns/retrieve/${TEST_EMAIL_DOMAIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretapikey: PORKBUN_SECRET_KEY,
        apikey: PORKBUN_API_KEY,
      }),
    });

    const dnsData = await dnsResponse.json();
    if (dnsData.status === 'SUCCESS') {
      console.log('✅ DNS records retrieved successfully!');
      console.log(`   Found ${dnsData.records?.length || 0} existing DNS records:`);
      if (dnsData.records && dnsData.records.length > 0) {
        dnsData.records.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.type} ${record.name} -> ${record.content}`);
        });
      }
    } else {
      console.log('❌ Failed to retrieve DNS records:', dnsData);
    }
  } catch (error) {
    console.error('❌ Error retrieving DNS records:', error.message);
  }

  // Test 3: Check domain info
  console.log(`\nTest 3: Retrieving domain info for ${TEST_EMAIL_DOMAIN}...`);
  try {
    const infoResponse = await fetch(`https://api.porkbun.com/api/json/v3/domain/listAll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretapikey: PORKBUN_SECRET_KEY,
        apikey: PORKBUN_API_KEY,
      }),
    });

    const infoData = await infoResponse.json();
    if (infoData.status === 'SUCCESS') {
      console.log('✅ Domain list retrieved successfully!');
      const domain = infoData.domains?.find(d => d.domain === TEST_EMAIL_DOMAIN);
      if (domain) {
        console.log(`   Domain found: ${domain.domain}`);
        console.log(`   Status: ${domain.status}`);
        console.log(`   Expires: ${domain.expireDate}`);
      } else {
        console.log(`   ⚠️  Domain ${TEST_EMAIL_DOMAIN} not found in account`);
      }
    } else {
      console.log('❌ Failed to retrieve domain list:', infoData);
    }
  } catch (error) {
    console.error('❌ Error retrieving domain info:', error.message);
  }

  console.log('\n✅ All Porkbun API tests complete!');
}

testPorkbunAPI();
