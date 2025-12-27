import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN_ID = '0f3f8318-f6c5-4933-a9ea-f692e4e1d8a3';

console.log('Verifying domain in Resend...\n');

async function verifyDomain() {
  try {
    // Trigger verification
    console.log('Triggering domain verification...');
    const { data: verifyResult, error: verifyError } = await resend.domains.verify(DOMAIN_ID);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return;
    }

    console.log('✅ Verification triggered successfully!\n');

    // Wait a moment for DNS propagation check
    console.log('Waiting for DNS checks...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get domain status
    console.log('\nChecking domain status...');
    const { data: domainInfo } = await resend.domains.get(DOMAIN_ID);

    console.log('\nDomain Status:');
    console.log(`  Name: ${domainInfo.name}`);
    console.log(`  Status: ${domainInfo.status}`);
    console.log(`  Region: ${domainInfo.region}`);
    console.log('');

    if (domainInfo.records) {
      console.log('DNS Record Verification Status:');
      domainInfo.records.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.record} (${record.name})`);
        console.log(`     Status: ${record.status}`);
      });
    }

    if (domainInfo.status === 'verified') {
      console.log('\n🎉 Domain is fully verified and ready to send emails!');
    } else if (domainInfo.status === 'pending') {
      console.log('\n⏳ Domain verification is pending. DNS records may still be propagating.');
      console.log('   This can take a few minutes. You can check again later.');
    } else {
      console.log(`\n⚠️  Domain status: ${domainInfo.status}`);
      console.log('   Check DNS records and try verifying again.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyDomain();
