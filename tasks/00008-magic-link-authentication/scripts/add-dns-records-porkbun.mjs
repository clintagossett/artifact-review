const PORKBUN_API_KEY = process.env.PORKBUN_API_KEY;
const PORKBUN_SECRET_KEY = process.env.PORKBUN_SECRET_KEY;
const DOMAIN = 'artifactreview-early.xyz';

const resendRecords = [
  {
    name: "resend._domainkey.mail",
    type: "TXT",
    content: "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3ZgCP59a1/iNppRx5zBft12wfqhdxxtIh+FP1wM8X1710WhlxmUWau32QXZHkd12pyKMaElOr15lWzRhqf69/ftj+V3Q+SxVPzjWrVv/8Y9UY1xdnD3pQBmt7fDmPWqMacotBefrXW/p/w6n/1HM1k++/XmeV3xxu59FMlFZztwIDAQAB"
  },
  {
    name: "send.mail",
    type: "MX",
    content: "feedback-smtp.us-east-1.amazonses.com",
    prio: "10"
  },
  {
    name: "send.mail",
    type: "TXT",
    content: "v=spf1 include:amazonses.com ~all"
  }
];

console.log(`Adding Resend DNS records to Porkbun for ${DOMAIN}...\n`);

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
  for (let i = 0; i < resendRecords.length; i++) {
    const record = resendRecords[i];
    console.log(`${i + 1}. Adding ${record.type} record: ${record.name}...`);

    const result = await addDNSRecord(record);

    if (result.status === 'SUCCESS') {
      console.log(`   ✅ Success! Record ID: ${result.id}`);
    } else {
      console.log(`   ❌ Failed: ${result.message}`);
    }
    console.log('');
  }

  // Verify records were added
  console.log('\nVerifying DNS records...');
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
    console.log(`\n✅ All DNS records for ${DOMAIN}:`);
    verifyData.records.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.type} ${r.name} -> ${r.content}`);
    });
  }
}

addAllRecords();
