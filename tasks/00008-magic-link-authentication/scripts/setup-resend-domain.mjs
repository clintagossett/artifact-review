import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN = process.env.TEST_EMAIL_DOMAIN;

console.log(`Setting up Resend for domain: ${DOMAIN}\n`);

async function setupResendDomain() {
  // Step 1: Check if domain already exists
  console.log('Step 1: Checking existing domains...');
  try {
    const { data: domains } = await resend.domains.list();
    const existingDomain = domains?.data?.find(d => d.name === DOMAIN);

    if (existingDomain) {
      console.log(`✅ Domain ${DOMAIN} already exists in Resend`);
      console.log(`   Status: ${existingDomain.status}`);
      console.log(`   ID: ${existingDomain.id}`);

      // Get the DNS records for this domain
      console.log('\nStep 2: Retrieving DNS records...');
      const { data: domainInfo } = await resend.domains.get(existingDomain.id);

      console.log('\n📋 DNS Records Required:\n');
      if (domainInfo.records) {
        domainInfo.records.forEach((record, index) => {
          console.log(`${index + 1}. ${record.record} record:`);
          console.log(`   Name: ${record.name}`);
          console.log(`   Value: ${record.value}`);
          if (record.priority) console.log(`   Priority: ${record.priority}`);
          console.log('');
        });
      }

      return domainInfo;
    }
  } catch (error) {
    console.log('⚠️  Error checking domains:', error.message);
  }

  // Step 2: Add the domain if it doesn't exist
  console.log(`\nAdding domain ${DOMAIN} to Resend...`);
  try {
    const { data: newDomain, error } = await resend.domains.create({
      name: DOMAIN,
    });

    if (error) {
      console.error('❌ Error adding domain:', error);
      return null;
    }

    console.log('✅ Domain added successfully!');
    console.log(`   ID: ${newDomain.id}`);
    console.log(`   Status: ${newDomain.status}`);

    console.log('\n📋 DNS Records Required:\n');
    if (newDomain.records) {
      newDomain.records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.record} record:`);
        console.log(`   Name: ${record.name}`);
        console.log(`   Value: ${record.value}`);
        if (record.priority) console.log(`   Priority: ${record.priority}`);
        console.log('');
      });
    }

    return newDomain;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return null;
  }
}

setupResendDomain();
