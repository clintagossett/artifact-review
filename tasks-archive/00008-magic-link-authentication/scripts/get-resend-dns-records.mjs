import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN_ID = '0f3f8318-f6c5-4933-a9ea-f692e4e1d8a3';

console.log('Getting DNS records for mail.artifactreview-early.xyz...\n');

async function getDNSRecords() {
  try {
    const { data: domainInfo } = await resend.domains.get(DOMAIN_ID);

    console.log('Domain Info:');
    console.log(`  Name: ${domainInfo.name}`);
    console.log(`  Status: ${domainInfo.status}`);
    console.log(`  Region: ${domainInfo.region}`);
    console.log('');

    console.log('📋 DNS Records to Add to Porkbun:\n');

    if (domainInfo.records) {
      domainInfo.records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.record} Record`);
        console.log(`   Type: ${record.record}`);
        console.log(`   Name: ${record.name}`);
        console.log(`   Value: ${record.value}`);
        if (record.priority) console.log(`   Priority: ${record.priority}`);
        console.log('   Status:', record.status || 'pending');
        console.log('');
      });

      // Output as JSON for easy parsing
      console.log('\nJSON format for automation:');
      console.log(JSON.stringify(domainInfo.records, null, 2));
    } else {
      console.log('No DNS records found.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getDNSRecords();
