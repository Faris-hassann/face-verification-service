@echo off
REM Model Download Script for Face Verification Service (Windows)
REM This script helps download ONNX face recognition models from Hugging Face

setlocal enabledelayedexpansion

set MODEL_DIR=src\models_files
set MODEL_FILE=face_model.onnx

REM Create models directory if it doesn't exist
if not exist "%MODEL_DIR%" mkdir "%MODEL_DIR%"

echo Face Verification Service - Model Download Script
echo ==================================================
echo.

REM Check if model already exists
if exist "%MODEL_DIR%\%MODEL_FILE%" (
    echo Model file already exists at %MODEL_DIR%\%MODEL_FILE%
    echo Do you want to overwrite it? (y/N)
    set /p response=
    if /i not "!response!"=="y" (
        echo Model download cancelled.
        exit /b 0
    )
)

echo Available ONNX Face Recognition Models:
echo 1. insightface/arcface_r50_v1 (Recommended - High accuracy)
echo 2. microsoft/DialoGPT-medium (Alternative)
echo 3. Custom model URL
echo.

echo Please select a model (1-3):
set /p choice=

if "%choice%"=="1" (
    echo Downloading insightface/arcface_r50_v1 model...
    set MODEL_URL=https://huggingface.co/insightface/arcface_r50_v1/resolve/main/model.onnx
) else if "%choice%"=="2" (
    echo Downloading microsoft/DialoGPT-medium model...
    set MODEL_URL=https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/model.onnx
) else if "%choice%"=="3" (
    echo Enter custom model URL:
    set /p MODEL_URL=
) else (
    echo Invalid choice. Exiting.
    exit /b 1
)

echo.
echo Downloading model from: !MODEL_URL!
echo Saving to: %MODEL_DIR%\%MODEL_FILE%

REM Download the model using PowerShell
powershell -Command "& {Invoke-WebRequest -Uri '!MODEL_URL!' -OutFile '%MODEL_DIR%\%MODEL_FILE%'}"

REM Check if download was successful
if exist "%MODEL_DIR%\%MODEL_FILE%" (
    echo.
    echo ✅ Model downloaded successfully!
    echo 📁 File: %MODEL_DIR%\%MODEL_FILE%
    echo.
    echo Next steps:
    echo 1. Update MODEL_PATH in your .env file if needed
    echo 2. Run 'npm start' to start the service
    echo 3. Test the API endpoints as described in README.md
) else (
    echo ❌ Model download failed!
    echo Please check the URL and try again.
    exit /b 1
)

echo.
echo ⚠️  If the file is large (>100MB), consider using Git LFS:
echo    git lfs track "*.onnx"
echo    git add .gitattributes
echo    git add %MODEL_DIR%\%MODEL_FILE%

pause
