# Test Images Directory

This directory should contain test images for the face verification service.

## Required Test Images

Create the following test images for comprehensive testing:

### Person Images
- `person1.jpg` - Clear, well-lit face of person 1
- `person1_same.jpg` - Same person as person1.jpg (different angle/lighting)
- `person1_dark.jpg` - Same person with poor lighting
- `person1_partial.jpg` - Same person with partial face visible
- `person2.jpg` - Different person (for negative testing)

### Edge Cases
- `multiple_faces.jpg` - Image with multiple faces
- `no_face.jpg` - Image with no faces (landscape, object, etc.)
- `large_image.jpg` - Very large image file (>10MB)
- `document.pdf` - Non-image file for format testing

## Image Requirements

- **Format**: JPEG or PNG
- **Size**: Between 1KB and 10MB
- **Resolution**: Minimum 50x50 pixels
- **Content**: Clear, well-lit faces for positive test cases

## Usage

These images are used in the test cases described in the README.md file.

## Note

Do not commit actual person images to the repository for privacy reasons.
Use placeholder or synthetic images for testing.
