// Simple environment test
require('dotenv').config();

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

// Test database connection with hardcoded values
const { Sequelize } = require('sequelize');

async function testConnection() {
  console.log('\nTesting database connection with hardcoded values...');
  
  const sequelize = new Sequelize({
    host: 'localhost',
    port: 5432,
    database: 'postgres', // Try default database first
    username: 'postgres',
    password: 'root',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Check if our target database exists
    const result = await sequelize.query("SELECT 1 FROM pg_database WHERE datname = 'face_verification_db';");
    
    if (result[0].length === 0) {
      console.log('Creating database "face_verification_db"...');
      await sequelize.query('CREATE DATABASE face_verification_db;');
      console.log('✅ Database created successfully!');
    } else {
      console.log('✅ Database "face_verification_db" already exists');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

testConnection();
