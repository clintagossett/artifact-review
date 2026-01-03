import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const testEmail = `test-${Date.now()}@tolauante.resend.app`;

console.log('Testing email send and retrieve with new domain...\n');

async function testEmailFlow() {
  // Step 1: Send email
  console.log(`Step 1: Sending test email to ${testEmail}...`);
  try {
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: 'Artifact Review <hello@artifactreview-early.xyz>',
      to: testEmail,
      subject: 'Test Email from New Domain',
      html: '<p>This is a test email to verify the new domain setup is working!</p>',
    });

    if (sendError) {
      console.error('❌ Error sending email:', sendError);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log(`   Email ID: ${sendData.id}`);

    // Step 2: Wait and retrieve
    console.log('\nStep 2: Waiting 3 seconds before retrieving...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Retrieving email details...');
    const { data: emailData, error: retrieveError } = await resend.emails.get(sendData.id);

    if (retrieveError) {
      console.error('❌ Error retrieving email:', retrieveError);
      return;
    }

    console.log('✅ Email retrieved successfully!');
    console.log('\nEmail Details:');
    console.log(`   ID: ${emailData.id}`);
    console.log(`   From: ${emailData.from}`);
    console.log(`   To: ${emailData.to}`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Status: ${emailData.last_event || 'sent'}`);
    console.log(`   Created: ${emailData.created_at}`);

    console.log('\n🎉 Email send and retrieve test completed successfully!');
    console.log(`\nYou can view this email in Resend dashboard or at: https://resend.com/emails/${sendData.id}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testEmailFlow();
