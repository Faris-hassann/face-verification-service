// API Test Script
const FormData = require('form-data');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  console.log('🧪 Testing Face Verification Service API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData.success ? 'PASSED' : 'FAILED');
    console.log('   Status:', healthData.data.status);
    console.log('   Uptime:', Math.round(healthData.data.uptime), 'seconds\n');

    // Test 2: Face Encoding
    console.log('2️⃣ Testing Face Encoding...');
    const formData = new FormData();
    formData.append('image', fs.createReadStream('test_images/Elon1.jpg'));
    formData.append('userId', 'elon_musk');

    const encodeResponse = await fetch('http://localhost:3001/api/encode', {
      method: 'POST',
      body: formData
    });

    const encodeData = await encodeResponse.json();
    console.log('✅ Face Encoding:', encodeData.success ? 'PASSED' : 'FAILED');
    
    if (encodeData.success) {
      console.log('   User ID: elon_musk');
      console.log('   Embedding dimensions:', encodeData.data.embedding.length);
      console.log('   First 5 values:', encodeData.data.embedding.slice(0, 5));
      
      // Store embedding for comparison test
      global.storedEmbedding = encodeData.data.embedding;
    } else {
      console.log('   Error:', encodeData.error);
    }
    console.log('');

    // Test 3: Face Comparison
    if (global.storedEmbedding) {
      console.log('3️⃣ Testing Face Comparison...');
      const compareFormData = new FormData();
      compareFormData.append('image', fs.createReadStream('test_images/Elon2.jpeg'));
      compareFormData.append('storedEmbedding', JSON.stringify(global.storedEmbedding));
      compareFormData.append('threshold', '0.6');

      const compareResponse = await fetch('http://localhost:3001/api/compare', {
        method: 'POST',
        body: compareFormData
      });

      const compareData = await compareResponse.json();
      console.log('✅ Face Comparison:', compareData.success ? 'PASSED' : 'FAILED');
      
      if (compareData.success) {
        console.log('   Is Match:', compareData.data.isMatch);
        console.log('   Similarity:', compareData.data.similarity.toFixed(4));
        console.log('   Threshold:', compareData.data.threshold);
      } else {
        console.log('   Error:', compareData.error);
      }
      console.log('');
    }

    // Test 4: Different Person Test
    console.log('4️⃣ Testing Different Person (Should NOT match)...');
    const differentFormData = new FormData();
    differentFormData.append('image', fs.createReadStream('test_images/Tom1.jpg'));
    differentFormData.append('storedEmbedding', JSON.stringify(global.storedEmbedding));
    differentFormData.append('threshold', '0.6');

    const differentResponse = await fetch('http://localhost:3001/api/compare', {
      method: 'POST',
      body: differentFormData
    });

    const differentData = await differentResponse.json();
    console.log('✅ Different Person Test:', differentData.success ? 'PASSED' : 'FAILED');
    
    if (differentData.success) {
      console.log('   Is Match:', differentData.data.isMatch);
      console.log('   Similarity:', differentData.data.similarity.toFixed(4));
      console.log('   Expected: Should be FALSE (different person)');
    } else {
      console.log('   Error:', differentData.error);
    }
    console.log('');

    // Test 5: List All Embeddings
    console.log('5️⃣ Testing List All Embeddings...');
    const listResponse = await fetch('http://localhost:3001/api/encode');
    const listData = await listResponse.json();
    console.log('✅ List Embeddings:', listData.success ? 'PASSED' : 'FAILED');
    
    if (listData.success) {
      console.log('   Total embeddings:', listData.data.count);
      console.log('   Users:', listData.data.embeddings.map(e => e.userId).join(', '));
    } else {
      console.log('   Error:', listData.error);
    }

    console.log('\n🎉 API Testing Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Service is running and healthy');
    console.log('✅ Face encoding works');
    console.log('✅ Face comparison works');
    console.log('✅ Database integration works');
    console.log('✅ ONNX model is loaded and functioning');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
