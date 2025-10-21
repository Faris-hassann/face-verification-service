# Face Verification Service

A comprehensive AI-powered face verification microservice built with Node.js, Express.js, and ONNX models. This service provides facial recognition capabilities for user registration and verification workflows.

## 🚀 Features

- **Face Encoding**: Convert facial images into 512-dimensional embeddings for storage
- **Face Comparison**: Compare new images against stored embeddings with configurable similarity thresholds
- **Batch Processing**: Support for comparing multiple faces simultaneously
- **PostgreSQL Integration**: Robust database storage for user embeddings and metadata
- **ONNX Model Support**: High-performance inference using ONNX Runtime
- **Comprehensive Error Handling**: Detailed error messages and validation
- **Rate Limiting**: Built-in protection against abuse
- **Logging**: Structured logging with Winston
- **Testing**: Comprehensive test suite with Jest
- **API Documentation**: Built-in API documentation endpoint

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- PostgreSQL 12 or higher
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd face-verification-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=face_verification_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   
   # Model Configuration
   MODEL_PATH=./src/models_files/face_model.onnx
   MODEL_INPUT_SIZE=112
   EMBEDDING_DIMENSION=512
   
   # Face Detection Configuration
   FACE_DETECTION_THRESHOLD=0.5
   SIMILARITY_THRESHOLD=0.6
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb face_verification_db
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE face_verification_db;"
   ```

5. **Download the ONNX Model**
   
   **Important**: You need to download a face recognition model from Hugging Face. Here are recommended models:
   
   - **Recommended**: [insightface/arcface_r50_v1](https://huggingface.co/insightface/arcface_r50_v1) - High accuracy
   - **Alternative**: [microsoft/DialoGPT-medium](https://huggingface.co/microsoft/DialoGPT-medium) - Good balance
   
   Download the ONNX model file and place it in `src/models_files/face_model.onnx`:
   ```bash
   # Create models directory
   mkdir -p src/models_files
   
   # Download model (example - replace with actual model URL)
   wget -O src/models_files/face_model.onnx <model-download-url>
   ```
   
   **Note**: If the model file is larger than 100MB, use Git LFS:
   ```bash
   git lfs track "*.onnx"
   git add .gitattributes
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📚 API Documentation

The service provides comprehensive API endpoints for face verification:

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /api/health
```

### API Documentation
```http
GET /api/docs
```

## 🔧 API Endpoints

### 1. Face Encoding (Registration)

#### Encode Face
```http
POST /api/encode
Content-Type: multipart/form-data

Fields:
- image: Image file (JPEG/PNG)
- userId: User ID (optional, auto-generated if not provided)
```

**Response:**
```json
{
  "success": true,
  "message": "Face encoding successful",
  "data": {
    "embedding": [0.0123, -0.0456, ..., 0.0789]
  }
}
```

#### Get User Embedding
```http
GET /api/encode/:userId
```

#### List All Embeddings
```http
GET /api/encode
```

#### Delete User Embedding
```http
DELETE /api/encode/:userId
```

### 2. Face Comparison (Verification)

#### Compare Face
```http
POST /api/compare
Content-Type: multipart/form-data

Fields:
- image: Image file (JPEG/PNG)
- storedEmbedding: JSON string of stored embedding array
- threshold: Similarity threshold (optional, default: 0.6)
```

**Response:**
```json
{
  "success": true,
  "message": "Face comparison completed",
  "data": {
    "isMatch": true,
    "similarity": 0.9218
  }
}
```

#### Compare Face by User ID
```http
POST /api/compare/:userId
Content-Type: multipart/form-data

Fields:
- image: Image file (JPEG/PNG)
- threshold: Similarity threshold (optional)
```

#### Batch Compare
```http
POST /api/compare/batch
Content-Type: multipart/form-data

Fields:
- images: Multiple image files
- storedEmbeddings: JSON array of stored embeddings
- threshold: Similarity threshold (optional)
```

## 🧪 Testing the Service

### Test Cases

Here are comprehensive test cases to verify the service functionality:

#### 1. Basic Face Encoding Test
```bash
curl -X POST http://localhost:3000/api/encode \
  -F "image=@test_images/person1.jpg" \
  -F "userId=user001"
```

#### 2. Face Comparison Test
```bash
# First, encode a face
curl -X POST http://localhost:3000/api/encode \
  -F "image=@test_images/person1.jpg" \
  -F "userId=user001"

# Then compare with the same person
curl -X POST http://localhost:3000/api/compare/user001 \
  -F "image=@test_images/person1_same.jpg"
```

#### 3. Different Person Test
```bash
curl -X POST http://localhost:3000/api/compare/user001 \
  -F "image=@test_images/person2.jpg"
```

#### 4. Poor Lighting Test
```bash
curl -X POST http://localhost:3000/api/compare/user001 \
  -F "image=@test_images/person1_dark.jpg"
```

#### 5. Partial Face Test
```bash
curl -X POST http://localhost:3000/api/compare/user001 \
  -F "image=@test_images/person1_partial.jpg"
```

#### 6. Multiple Faces Test
```bash
curl -X POST http://localhost:3000/api/encode \
  -F "image=@test_images/multiple_faces.jpg"
```

#### 7. No Face Test
```bash
curl -X POST http://localhost:3000/api/encode \
  -F "image=@test_images/no_face.jpg"
```

#### 8. Invalid Image Format Test
```bash
curl -X POST http://localhost:3000/api/encode \
  -F "image=@test_images/document.pdf"
```

#### 9. Large Image Test
```bash
curl -X POST http://localhost:3000/api/encode \
  -F "image=@test_images/large_image.jpg"
```

#### 10. Batch Comparison Test
```bash
curl -X POST http://localhost:3000/api/compare/batch \
  -F "images=@test_images/person1.jpg" \
  -F "images=@test_images/person2.jpg" \
  -F "storedEmbeddings=[{\"embedding\":[0.1,0.2,...]},{\"embedding\":[0.3,0.4,...]}]"
```

### Expected Results

- **Same Person**: `isMatch: true`, `similarity > 0.6`
- **Different Person**: `isMatch: false`, `similarity < 0.6`
- **Poor Lighting**: Should still work with reasonable accuracy
- **Partial Face**: May fail with "No face detected" or low similarity
- **Multiple Faces**: Should return "Multiple faces detected" error
- **No Face**: Should return "No face detected" error
- **Invalid Format**: Should return "Invalid image format" error
- **Large Image**: Should return "Image too large" error

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | face_verification_db |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `MODEL_PATH` | ONNX model file path | ./src/models_files/face_model.onnx |
| `MODEL_INPUT_SIZE` | Model input size | 112 |
| `EMBEDDING_DIMENSION` | Embedding dimension | 512 |
| `FACE_DETECTION_THRESHOLD` | Face detection threshold | 0.5 |
| `SIMILARITY_THRESHOLD` | Similarity threshold | 0.6 |
| `MAX_FILE_SIZE` | Maximum file size (bytes) | 10485760 (10MB) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Model Configuration

The service uses ONNX models for face recognition. Key configuration options:

- **Model Input Size**: 112x112 pixels (standard for face recognition)
- **Embedding Dimension**: 512 dimensions (standard for face embeddings)
- **Similarity Threshold**: 0.6 (adjustable based on use case)

## 🏗️ Architecture

### Project Structure
```
face-verification-service/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # API controllers
│   ├── middlewares/      # Express middlewares
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── models_files/    # ONNX model files
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### Key Components

1. **Face Service**: Handles face detection, preprocessing, and embedding generation
2. **Similarity Service**: Calculates cosine similarity between embeddings
3. **Image Service**: Handles image processing, validation, and preprocessing
4. **Database Models**: Sequelize models for user embeddings storage
5. **Controllers**: Handle HTTP requests and responses
6. **Middleware**: File upload, validation, and error handling

## 🚨 Error Handling

The service provides comprehensive error handling:

### Common Error Responses

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Error Types

- **400 Bad Request**: Invalid input, missing files, validation errors
- **404 Not Found**: User not found, endpoint not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server errors, model loading failures

## 📊 Performance Considerations

- **Model Loading**: ONNX model is loaded once at startup
- **Memory Management**: Efficient image processing with Jimp/Sharp
- **Database Optimization**: Indexed queries and connection pooling
- **Rate Limiting**: Built-in protection against abuse
- **Batch Processing**: Support for multiple image processing

## 🔒 Security Features

- **Input Validation**: Comprehensive file and data validation
- **Rate Limiting**: Protection against abuse and DoS attacks
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Helmet**: Security headers and protection
- **File Type Validation**: Only allows specific image formats

## 🐛 Troubleshooting

### Common Issues

1. **Model Not Found**
   ```
   Error: Model file not found at ./src/models_files/face_model.onnx
   ```
   **Solution**: Download the ONNX model and place it in the correct directory

2. **Database Connection Failed**
   ```
   Error: Unable to connect to the database
   ```
   **Solution**: Check PostgreSQL is running and credentials are correct

3. **No Face Detected**
   ```
   Error: No face detected in the image
   ```
   **Solution**: Ensure image contains a clear, well-lit face

4. **Multiple Faces Detected**
   ```
   Error: Multiple faces detected. Please provide an image with only one face
   ```
   **Solution**: Crop image to contain only one face

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [ONNX Runtime](https://onnxruntime.ai/) for model inference
- [Hugging Face](https://huggingface.co/) for pre-trained models
- [Sequelize](https://sequelize.org/) for database ORM
- [Express.js](https://expressjs.com/) for web framework
- [Jimp](https://github.com/oliver-moran/jimp) for image processing

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api/docs`
- Review the test cases for usage examples

---

**Note**: This service requires a valid ONNX face recognition model. Please download an appropriate model from Hugging Face and place it in the `src/models_files/` directory before running the service.
