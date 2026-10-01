const Jimp = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, 'mobile/assets/images/logo.png');
const outputPath = path.join(__dirname, 'mobile/assets/images/notification-icon.png');

async function processImage() {
  try {
    const image = await Jimp.read(inputPath);
    
    // Resize to 96x96 (max)
    image.scaleToFit(96, 96);
    
    // Iterate over all pixels and make any non-transparent pixel white
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const alpha = this.bitmap.data[idx + 3];
      if (alpha > 0) {
        this.bitmap.data[idx] = 255;     // red
        this.bitmap.data[idx + 1] = 255; // green
        this.bitmap.data[idx + 2] = 255; // blue
        // Keep the original alpha
      }
    });

    await image.writeAsync(outputPath);
    console.log('Successfully generated Android notification icon at:', outputPath);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
