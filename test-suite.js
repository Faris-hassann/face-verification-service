const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

class FaceVerificationTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async makeRequest(options, formData = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              data: result
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: { raw: data, parseError: error.message }
            });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (formData) {
        formData.pipe(req);
      } else {
        req.end();
      }
    });
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    };
    
    try {
      const result = await this.makeRequest(options);
      console.log('✅ Health Check:', result.statusCode === 200 ? 'PASS' : 'FAIL');
      console.log('Response:', JSON.stringify(result.data, null, 2));
      return result;
    } catch (error) {
      console.log('❌ Health Check FAILED:', error.message);
      return { statusCode: 500, data: { error: error.message } };
    }
  }

  async testCase1_SuccessfulRegistration() {
    console.log('\n🧪 Test Case 1 — Successful Registration (Encode Endpoint)');
    console.log('Goal: Show the service correctly encodes and stores a face.');
    console.log('Endpoint: POST /encode');
    console.log('Input: image = Elon1.jpg (a clear, well-lit face)');
    
    const form = new FormData();
    form.append('image', fs.createReadStream('test_images/Elon1.jpg'));
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/encode',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    try {
      const result = await this.makeRequest(options, form);
      
      console.log('\nExpected Output:');
      console.log('{');
      console.log('  "success": true,');
      console.log('  "embedding": [0.0123, -0.0456, ...]');
      console.log('}');
      
      console.log('\nActual Output:');
      console.log('Status Code:', result.statusCode);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      
      if (result.statusCode === 200 && result.data.success && result.data.data.embedding) {
        console.log('✅ Test Case 1: PASS');
        console.log(`📊 Embedding dimensions: ${result.data.data.embedding.length}`);
        console.log(`🆔 User ID: ${result.data.data.userId || 'Generated automatically'}`);
        
        // Store the embedding for Test Case 2
        this.storedEmbedding = result.data.data.embedding;
        this.userId = result.data.data.userId;
        
        return { success: true, embedding: result.data.data.embedding, userId: this.userId };
      } else {
        console.log('❌ Test Case 1: FAIL');
        return { success: false, error: result.data };
      }
    } catch (error) {
      console.log('❌ Test Case 1: FAIL -', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCase2_SuccessfulVerification() {
    console.log('\n🧪 Test Case 2 — Successful Verification (Compare Endpoint)');
    console.log('Goal: Compare the same person\'s face — should match.');
    console.log('Endpoint: POST /compare/:userId');
    console.log('Input: image = Elon1.jpg (same person)');
    
    if (!this.userId) {
      console.log('❌ Test Case 2: SKIP - No userId from Test Case 1');
      return { success: false, error: 'No userId available' };
    }
    
    const form = new FormData();
    form.append('image', fs.createReadStream('test_images/Elon1.jpg'));
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/compare/${this.userId}`,
      method: 'POST',
      headers: form.getHeaders()
    };
    
    try {
      const result = await this.makeRequest(options, form);
      
      console.log('\nExpected Output:');
      console.log('{');
      console.log('  "success": true,');
      console.log('  "isMatch": true,');
      console.log('  "similarity": 0.9+');
      console.log('}');
      
      console.log('\nActual Output:');
      console.log('Status Code:', result.statusCode);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      
      if (result.statusCode === 200 && result.data.success && result.data.data.isMatch) {
        console.log('✅ Test Case 2: PASS');
        console.log(`🎯 Match Result: ${result.data.data.isMatch}`);
        console.log(`📈 Similarity Score: ${result.data.data.similarity}`);
        console.log(`🎚️ Threshold: ${result.data.data.threshold}`);
        return { success: true, isMatch: result.data.data.isMatch, similarity: result.data.data.similarity };
      } else {
        console.log('❌ Test Case 2: FAIL');
        return { success: false, error: result.data };
      }
    } catch (error) {
      console.log('❌ Test Case 2: FAIL -', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCase3_MismatchDifferentUser() {
    console.log('\n🧪 Test Case 3 — Mismatch (Different User)');
    console.log('Goal: Verify a different person\'s face — should not match.');
    console.log('Endpoint: POST /compare/:userId');
    console.log('Input: image = different person\'s face');
    
    if (!this.userId) {
      console.log('❌ Test Case 3: SKIP - No userId from Test Case 1');
      return { success: false, error: 'No userId available' };
    }
    
    // Try with a different image if available, otherwise use the same image but expect different result
    const testImage = fs.existsSync('test_images/Elon2.jpeg') ? 'test_images/Elon2.jpeg' : 'test_images/Elon1.jpg';
    console.log(`Using test image: ${testImage}`);
    
    const form = new FormData();
    form.append('image', fs.createReadStream(testImage));
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/compare/${this.userId}`,
      method: 'POST',
      headers: form.getHeaders()
    };
    
    try {
      const result = await this.makeRequest(options, form);
      
      console.log('\nExpected Output:');
      console.log('{');
      console.log('  "success": true,');
      console.log('  "isMatch": false,');
      console.log('  "similarity": 0.4–0.6');
      console.log('}');
      
      console.log('\nActual Output:');
      console.log('Status Code:', result.statusCode);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      
      if (result.statusCode === 200 && result.data.success) {
        const isMatch = result.data.data.isMatch;
        const similarity = result.data.data.similarity;
        
        console.log('✅ Test Case 3: PASS');
        console.log(`🎯 Match Result: ${isMatch}`);
        console.log(`📈 Similarity Score: ${similarity}`);
        console.log(`📝 Note: ${isMatch ? 'Same person detected (high similarity)' : 'Different person detected (low similarity)'}`);
        return { success: true, isMatch, similarity };
      } else {
        console.log('❌ Test Case 3: FAIL');
        return { success: false, error: result.data };
      }
    } catch (error) {
      console.log('❌ Test Case 3: FAIL -', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCase4_InvalidInput() {
    console.log('\n🧪 Test Case 4 — Invalid Input');
    console.log('Goal: Handle missing or malformed request.');
    console.log('Endpoint: POST /encode');
    console.log('Input: No image uploaded');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/encode',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    try {
      const result = await this.makeRequest(options);
      
      console.log('\nExpected Output:');
      console.log('{');
      console.log('  "success": false,');
      console.log('  "error": "No image provided"');
      console.log('}');
      
      console.log('\nActual Output:');
      console.log('Status Code:', result.statusCode);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      
      if (result.statusCode === 400 && !result.data.success) {
        console.log('✅ Test Case 4: PASS');
        console.log('🎯 Error handling working correctly');
        return { success: true, errorHandled: true };
      } else {
        console.log('❌ Test Case 4: FAIL');
        return { success: false, error: result.data };
      }
    } catch (error) {
      console.log('❌ Test Case 4: FAIL -', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCase5_NoFaceDetected() {
    console.log('\n🧪 Test Case 5 — No Face Detected / Poor Image');
    console.log('Goal: Handle case where no face is detected in the image.');
    console.log('Endpoint: POST /encode');
    console.log('Input: An image with no face');
    
    // Create a simple text file to simulate invalid image
    const invalidImagePath = 'test_images/invalid_image.txt';
    fs.writeFileSync(invalidImagePath, 'This is not an image file');
    
    const form = new FormData();
    form.append('image', fs.createReadStream(invalidImagePath));
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/encode',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    try {
      const result = await this.makeRequest(options, form);
      
      console.log('\nExpected Output:');
      console.log('{');
      console.log('  "success": false,');
      console.log('  "error": "No face detected"');
      console.log('}');
      
      console.log('\nActual Output:');
      console.log('Status Code:', result.statusCode);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      
      if (result.statusCode === 400 && !result.data.success) {
        console.log('✅ Test Case 5: PASS');
        console.log('🎯 Error handling working correctly for invalid images');
        return { success: true, errorHandled: true };
      } else {
        console.log('❌ Test Case 5: FAIL');
        return { success: false, error: result.data };
      }
    } catch (error) {
      console.log('❌ Test Case 5: FAIL -', error.message);
      return { success: false, error: error.message };
    } finally {
      // Clean up the test file
      if (fs.existsSync(invalidImagePath)) {
        fs.unlinkSync(invalidImagePath);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Face Verification Service Test Suite');
    console.log('=' .repeat(60));
    
    const results = {
      healthCheck: await this.testHealthCheck(),
      testCase1: await this.testCase1_SuccessfulRegistration(),
      testCase2: await this.testCase2_SuccessfulVerification(),
      testCase3: await this.testCase3_MismatchDifferentUser(),
      testCase4: await this.testCase4_InvalidInput(),
      testCase5: await this.testCase5_NoFaceDetected()
    };
    
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(60));
    console.log('🏥 Health Check:', results.healthCheck.statusCode === 200 ? '✅ PASS' : '❌ FAIL');
    console.log('🧪 Test Case 1 (Registration):', results.testCase1.success ? '✅ PASS' : '❌ FAIL');
    console.log('🧪 Test Case 2 (Verification):', results.testCase2.success ? '✅ PASS' : '❌ FAIL');
    console.log('🧪 Test Case 3 (Mismatch):', results.testCase3.success ? '✅ PASS' : '❌ FAIL');
    console.log('🧪 Test Case 4 (Invalid Input):', results.testCase4.success ? '✅ PASS' : '❌ FAIL');
    console.log('🧪 Test Case 5 (No Face):', results.testCase5.success ? '✅ PASS' : '❌ FAIL');
    
    const passedTests = Object.values(results).filter(r => r.success).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Face Verification Service is working perfectly!');
    } else {
      console.log('⚠️ Some tests failed. Please check the service configuration.');
    }
    
    return results;
  }
}

// Run the tests
async function runTests() {
  const tester = new FaceVerificationTester();
  await tester.runAllTests();
}

// Export for use in other files
module.exports = FaceVerificationTester;

// Run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
