import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN_ID = 'd0c15326-141d-41a4-ac37-bd484a1d07ed';

console.log('Verifying artifactreview-early.xyz in Resend...\n');

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

    // Wait for DNS checks
    console.log('Waiting 5 seconds for DNS checks...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get domain status
    console.log('\nChecking domain status...');
    const { data: domainInfo, error: getError } = await resend.domains.get(DOMAIN_ID);

    if (getError) {
      console.error('❌ Error getting domain:', getError);
      return;
    }

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
      console.log('\nYou can now send from: hello@artifactreview-early.xyz');
    } else if (domainInfo.status === 'pending') {
      console.log('\n⏳ Domain verification is pending. DNS records may still be propagating.');
      console.log('   Try again in a few minutes.');
    } else {
      console.log(`\n⚠️  Domain status: ${domainInfo.status}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyDomain();
