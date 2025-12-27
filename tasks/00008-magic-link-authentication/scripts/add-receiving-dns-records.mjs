const PORKBUN_API_KEY = process.env.PORKBUN_API_KEY;
const PORKBUN_SECRET_KEY = process.env.PORKBUN_SECRET_KEY;
const DOMAIN = 'artifactreview-early.xyz';

// Additional records from dns.txt
const additionalRecords = [
  {
    name: "",  // @ (root domain) for receiving
    type: "MX",
    content: "inbound-smtp.us-east-1.amazonaws.com",
    prio: "10"
  },
  {
    name: "_dmarc",
    type: "TXT",
    content: "v=DMARC1; p=none;"
  }
];

console.log(`Adding receiving and DMARC DNS records for ${DOMAIN}...\n`);

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

async function addAllRecords() {
  console.log('Adding new DNS records:\n');

  for (let i = 0; i < additionalRecords.length; i++) {
    const record = additionalRecords[i];
    const displayName = record.name || '@';
    console.log(`${i + 1}. Adding ${record.type} record: ${displayName}...`);

    const result = await addDNSRecord(record);

    if (result.status === 'SUCCESS') {
      console.log(`   ✅ Success! Record ID: ${result.id}`);
    } else {
      console.log(`   ❌ Failed: ${result.message}`);
    }
    console.log('');
  }

  // List all DNS records
  console.log('\nVerifying complete DNS configuration...\n');
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
    console.log(`✅ Complete DNS configuration for ${DOMAIN}:\n`);

    // Group records by purpose
    const sendingRecords = verifyData.records.filter(r =>
      r.name.includes('resend._domainkey') || r.name.includes('send.')
    );
    const receivingRecords = verifyData.records.filter(r =>
      r.type === 'MX' && r.name === DOMAIN && r.content.includes('inbound-smtp')
    );
    const dmarcRecords = verifyData.records.filter(r =>
      r.name.includes('_dmarc')
    );
    const otherRecords = verifyData.records.filter(r =>
      !sendingRecords.includes(r) &&
      !receivingRecords.includes(r) &&
      !dmarcRecords.includes(r)
    );

    if (sendingRecords.length > 0) {
      console.log('📤 Sending Records (Resend):');
      sendingRecords.forEach(r => {
        console.log(`  ${r.type} ${r.name} -> ${r.content.substring(0, 50)}${r.content.length > 50 ? '...' : ''}`);
      });
      console.log('');
    }

    if (receivingRecords.length > 0) {
      console.log('📥 Receiving Records:');
      receivingRecords.forEach(r => {
        console.log(`  ${r.type} ${r.name} -> ${r.content}`);
      });
      console.log('');
    }

    if (dmarcRecords.length > 0) {
      console.log('🔒 DMARC Records:');
      dmarcRecords.forEach(r => {
        console.log(`  ${r.type} ${r.name} -> ${r.content}`);
      });
      console.log('');
    }

    if (otherRecords.length > 0) {
      console.log('🔧 Other Records:');
      otherRecords.forEach(r => {
        console.log(`  ${r.type} ${r.name} -> ${r.content.substring(0, 50)}${r.content.length > 50 ? '...' : ''}`);
      });
    }
  }
}

addAllRecords();
