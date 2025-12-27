import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('Testing Resend API access...');

try {
  // Test 1: Send a test email to Resend test inbox
  const testEmail = `test-${Date.now()}@tolauante.resend.app`;
  console.log(`\nSending test email to: ${testEmail}`);

  const { data: sendData, error: sendError } = await resend.emails.send({
    from: 'Artifact Review <onboarding@resend.dev>',
    to: testEmail,
    subject: 'Resend API Test',
    html: '<p>This is a test email from the Resend API validation.</p>',
  });

  if (sendError) {
    console.error('Error sending email:', sendError);
  } else {
    console.log('Email sent successfully!');
    console.log('Email ID:', sendData.id);

    // Test 2: Retrieve the email we just sent
    console.log('\nWaiting 2 seconds before retrieving email...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Attempting to retrieve email...');
    const { data: retrieveData, error: retrieveError } = await resend.emails.get(sendData.id);

    if (retrieveError) {
      console.error('Error retrieving email:', retrieveError);
    } else {
      console.log('Email retrieved successfully!');
      console.log('Email details:', JSON.stringify(retrieveData, null, 2));
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
