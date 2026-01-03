const PORKBUN_API_KEY = process.env.PORKBUN_API_KEY;
const PORKBUN_SECRET_KEY = process.env.PORKBUN_SECRET_KEY;
const DOMAIN = 'artifactreview-early.xyz';

const newResendRecords = [
  {
    name: "resend._domainkey",
    type: "TXT",
    content: "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCsVn0VRHr3KX4VQBkz0kqXxZd5aGwC3rgI0M9CUc7a7PBw5ovpEnbADXqqahrauwyM9QiMzUUGO3RZzAkOCGsBWuuqYOBMFXMSAU5EA2XKGCHRAF5Ic7rPMH78rjxfii7Y1ohRF7MycjtWxFaZ+HbM2wBmUfK+g2A6OpQA948KLQIDAQAB"
  },
  {
    name: "send",
    type: "MX",
    content: "feedback-smtp.us-east-1.amazonses.com",
    prio: "10"
  },
  {
    name: "send",
    type: "TXT",
    content: "v=spf1 include:amazonses.com ~all"
  }
];

console.log(`Updating DNS records for ${DOMAIN}...\n`);

async function addDNSRecord(record) {
  try {
    const response = await fetch(`https://api.porkbun.com/api/json/v3/dns/create/${DOMAIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretapikey: PORKBUN_SECRET_KEY,
        apikey: PORKBUN_API_KEY,
        name: record.name,
        type: record.type,
        content: record.content,
        ...(record.prio && { prio: record.prio }),
        ttl: '600'
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error adding record:`, error.message);
    return { status: 'ERROR', message: error.message };
  }
}

async function updateAllRecords() {
  // First, list existing records
  console.log('Step 1: Checking existing DNS records...\n');
  const listResponse = await fetch(`https://api.porkbun.com/api/json/v3/dns/retrieve/${DOMAIN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secretapikey: PORKBUN_SECRET_KEY,
      apikey: PORKBUN_API_KEY,
    }),
  });

  const listData = await listResponse.json();
  if (listData.status === 'SUCCESS') {
    console.log(`Found ${listData.records.length} existing records`);

    // Show Resend-related records
    const resendRecords = listData.records.filter(r =>
      r.name.includes('resend') || r.name.includes('send.mail')
    );
    if (resendRecords.length > 0) {
      console.log('\nExisting Resend records (old mail. subdomain):');
      resendRecords.forEach(r => {
        console.log(`  ${r.type} ${r.name} (ID: ${r.id})`);
      });
      console.log('\nNote: Old records can coexist with new ones.\n');
    }
  }

  // Add new records
  console.log('Step 2: Adding new DNS records for root domain...\n');
  for (let i = 0; i < newResendRecords.length; i++) {
    const record = newResendRecords[i];
    console.log(`${i + 1}. Adding ${record.type} record: ${record.name}...`);

    const result = await addDNSRecord(record);

    if (result.status === 'SUCCESS') {
      console.log(`   ✅ Success! Record ID: ${result.id}`);
    } else {
      console.log(`   ❌ Failed: ${result.message}`);
    }
    console.log('');
  }

  // Verify all records
  console.log('\nStep 3: Verifying all DNS records...\n');
  const verifyResponse = await fetch(`https://api.porkbun.com/api/json/v3/dns/retrieve/${DOMAIN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secretapikey: PORKBUN_SECRET_KEY,
      apikey: PORKBUN_API_KEY,
    }),
  });

  const verifyData = await verifyResponse.json();
  if (verifyData.status === 'SUCCESS') {
    console.log(`✅ All ${verifyData.records.length} DNS records for ${DOMAIN}:`);
    verifyData.records.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.type} ${r.name} -> ${r.content.substring(0, 50)}${r.content.length > 50 ? '...' : ''}`);
    });
  }
}

updateAllRecords();
