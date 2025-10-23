const FaceVerificationTester = require('./test-suite');

// Command line interface for running specific tests
const args = process.argv.slice(2);
const testCase = args[0];

async function runSpecificTest() {
  const tester = new FaceVerificationTester();
  
  console.log('🧪 Face Verification Service - Individual Test Runner');
  console.log('=' .repeat(50));
  
  switch (testCase) {
    case 'health':
      await tester.testHealthCheck();
      break;
    case '1':
    case 'registration':
      await tester.testCase1_SuccessfulRegistration();
      break;
    case '2':
    case 'verification':
      await tester.testCase2_SuccessfulVerification();
      break;
    case '3':
    case 'mismatch':
      await tester.testCase3_MismatchDifferentUser();
      break;
    case '4':
    case 'invalid':
      await tester.testCase4_InvalidInput();
      break;
    case '5':
    case 'noface':
      await tester.testCase5_NoFaceDetected();
      break;
    case 'all':
      await tester.runAllTests();
      break;
    default:
      console.log('Usage: node test-runner.js [test-case]');
      console.log('');
      console.log('Available test cases:');
      console.log('  health      - Health check');
      console.log('  1, registration - Test Case 1: Successful Registration');
      console.log('  2, verification - Test Case 2: Successful Verification');
      console.log('  3, mismatch  - Test Case 3: Mismatch (Different User)');
      console.log('  4, invalid   - Test Case 4: Invalid Input');
      console.log('  5, noface    - Test Case 5: No Face Detected');
      console.log('  all         - Run all tests');
      console.log('');
      console.log('Examples:');
      console.log('  node test-runner.js all');
      console.log('  node test-runner.js 1');
      console.log('  node test-runner.js registration');
      break;
  }
}

runSpecificTest().catch(console.error);
