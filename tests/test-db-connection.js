// Database connection test script
require('dotenv').config();
const { Sequelize } = require('sequelize');

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Configuration:');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Port: ${process.env.DB_PORT}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Password: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`);
  
  const sequelize = new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'face_verification_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test creating a simple table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Database operations successful!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if PostgreSQL is running');
    console.log('2. Verify database credentials in .env file');
    console.log('3. Ensure database "face_verification_db" exists');
    console.log('4. Check if user has proper permissions');
  } finally {
    await sequelize.close();
  }
}

testConnection();
