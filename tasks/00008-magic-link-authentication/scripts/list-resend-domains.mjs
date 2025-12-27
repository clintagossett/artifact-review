import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('Listing Resend domains...\n');

async function listDomains() {
  try {
    const { data: domains } = await resend.domains.list();

    if (domains?.data && domains.data.length > 0) {
      console.log(`Found ${domains.data.length} domain(s):\n`);
      domains.data.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.name}`);
        console.log(`   ID: ${domain.id}`);
        console.log(`   Status: ${domain.status}`);
        console.log(`   Region: ${domain.region}`);
        console.log(`   Created: ${domain.createdAt}`);
        console.log('');
      });
    } else {
      console.log('No domains found.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listDomains();
