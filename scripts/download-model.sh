#!/bin/bash

# Model Download Script for Face Verification Service
# This script helps download ONNX face recognition models from Hugging Face

set -e

MODEL_DIR="src/models_files"
MODEL_FILE="face_model.onnx"

# Create models directory if it doesn't exist
mkdir -p "$MODEL_DIR"

echo "Face Verification Service - Model Download Script"
echo "=================================================="
echo ""

# Check if model already exists
if [ -f "$MODEL_DIR/$MODEL_FILE" ]; then
    echo "Model file already exists at $MODEL_DIR/$MODEL_FILE"
    echo "Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Model download cancelled."
        exit 0
    fi
fi

echo "Available ONNX Face Recognition Models:"
echo "1. insightface/arcface_r50_v1 (Recommended - High accuracy)"
echo "2. microsoft/DialoGPT-medium (Alternative)"
echo "3. Custom model URL"
echo ""

echo "Please select a model (1-3):"
read -r choice

case $choice in
    1)
        echo "Downloading insightface/arcface_r50_v1 model..."
        MODEL_URL="https://huggingface.co/insightface/arcface_r50_v1/resolve/main/model.onnx"
        ;;
    2)
        echo "Downloading microsoft/DialoGPT-medium model..."
        MODEL_URL="https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/model.onnx"
        ;;
    3)
        echo "Enter custom model URL:"
        read -r MODEL_URL
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Downloading model from: $MODEL_URL"
echo "Saving to: $MODEL_DIR/$MODEL_FILE"

# Download the model
if command -v wget &> /dev/null; then
    wget -O "$MODEL_DIR/$MODEL_FILE" "$MODEL_URL"
elif command -v curl &> /dev/null; then
    curl -L -o "$MODEL_DIR/$MODEL_FILE" "$MODEL_URL"
else
    echo "Error: Neither wget nor curl is available. Please install one of them."
    exit 1
fi

# Check if download was successful
if [ -f "$MODEL_DIR/$MODEL_FILE" ]; then
    FILE_SIZE=$(du -h "$MODEL_DIR/$MODEL_FILE" | cut -f1)
    echo ""
    echo "✅ Model downloaded successfully!"
    echo "📁 File: $MODEL_DIR/$MODEL_FILE"
    echo "📏 Size: $FILE_SIZE"
    echo ""
    echo "Next steps:"
    echo "1. Update MODEL_PATH in your .env file if needed"
    echo "2. Run 'npm start' to start the service"
    echo "3. Test the API endpoints as described in README.md"
else
    echo "❌ Model download failed!"
    echo "Please check the URL and try again."
    exit 1
fi

# Check if file is large and suggest Git LFS
FILE_SIZE_BYTES=$(stat -c%s "$MODEL_DIR/$MODEL_FILE" 2>/dev/null || stat -f%z "$MODEL_DIR/$MODEL_FILE" 2>/dev/null)
if [ "$FILE_SIZE_BYTES" -gt 104857600 ]; then  # 100MB
    echo ""
    echo "⚠️  Large file detected (>100MB). Consider using Git LFS:"
    echo "   git lfs track \"*.onnx\""
    echo "   git add .gitattributes"
    echo "   git add $MODEL_DIR/$MODEL_FILE"
fi
