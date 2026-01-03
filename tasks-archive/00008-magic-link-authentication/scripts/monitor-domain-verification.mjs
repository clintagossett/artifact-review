import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN_ID = '0f3f8318-f6c5-4933-a9ea-f692e4e1d8a3';
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_CHECKS = 20; // Check for up to 10 minutes

console.log('Monitoring domain verification status...\n');
console.log('Will check every 30 seconds for up to 10 minutes.\n');

let checkCount = 0;

async function checkStatus() {
  checkCount++;
  console.log(`[Check ${checkCount}/${MAX_CHECKS}] Checking domain status...`);

  try {
    const { data: domainInfo } = await resend.domains.get(DOMAIN_ID);

    console.log(`  Status: ${domainInfo.status}`);

    if (domainInfo.status === 'verified') {
      console.log('\n🎉 SUCCESS! Domain is now verified!');
      console.log('\nYou can now:');
      console.log('1. Send emails from hello@mail.artifactreview-early.xyz');
      console.log('2. Run E2E tests with email retrieval');
      console.log('3. Test the full magic link flow\n');
      process.exit(0);
    }

    if (domainInfo.records) {
      const verifiedRecords = domainInfo.records.filter(r => r.status === 'verified').length;
      const totalRecords = domainInfo.records.length;
      console.log(`  Records verified: ${verifiedRecords}/${totalRecords}`);
    }

    if (checkCount >= MAX_CHECKS) {
      console.log('\n⚠️  Reached maximum check attempts.');
      console.log('DNS propagation can sometimes take longer. Please check manually later.');
      console.log(`Visit: https://resend.com/domains/${DOMAIN_ID}\n`);
      process.exit(1);
    }

    console.log(`  Next check in 30 seconds...\n`);
    setTimeout(checkStatus, CHECK_INTERVAL);

  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    process.exit(1);
  }
}

// Start monitoring
checkStatus();
