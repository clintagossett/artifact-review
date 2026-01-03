import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN_ID = 'd0c15326-141d-41a4-ac37-bd484a1d07ed';

console.log('Getting info for current domain...\n');

async function getDomainInfo() {
  try {
    const { data: domainInfo, error } = await resend.domains.get(DOMAIN_ID);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Domain Info:');
    console.log(`  Name: ${domainInfo.name}`);
    console.log(`  ID: ${domainInfo.id}`);
    console.log(`  Status: ${domainInfo.status}`);
    console.log(`  Region: ${domainInfo.region}`);
    console.log('');

    console.log('📋 DNS Records Required:\n');

    if (domainInfo.records) {
      domainInfo.records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.record} Record`);
        console.log(`   Type: ${record.type}`);
        console.log(`   Name: ${record.name}`);
        console.log(`   Value: ${record.value}`);
        if (record.priority) console.log(`   Priority: ${record.priority}`);
        console.log(`   Status: ${record.status || 'not_started'}`);
        console.log('');
      });

      // Output as JSON
      console.log('\nJSON format:');
      console.log(JSON.stringify(domainInfo.records, null, 2));
    } else {
      console.log('No DNS records found.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getDomainInfo();
