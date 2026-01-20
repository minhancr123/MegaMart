/**
 * Script to create sample product images structure
 * Run: node create-sample-images.js
 */

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', 'client', 'public', 'images', 'products');

// Create directory if not exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('✅ Created images directory:', imagesDir);
}

// Sample products with SKUs (từ database của bạn)
const sampleProducts = [
  {
    name: 'MacBook Air M3',
    skus: ['MBA-M3-8-256-SG', 'MBA-M3-8-512-SG', 'MBA-M3-16-512-SG'],
  },
  {
    name: 'iPhone 15 Pro',
    skus: ['IP15-PRO-256-TITAN', 'IP15-PRO-512-BLACK', 'IP15-PRO-1TB-BLUE'],
  },
  {
    name: 'Samsung Galaxy S24',
    skus: ['SS-S24-128-BLACK', 'SS-S24-256-GRAY', 'SS-S24-512-WHITE'],
  },
];

// Create a README in the images folder
const readme = `# Product Images Folder

## 📸 How to Add Images

### Naming Convention:
- \`{SKU}.jpg\` - Main image for variant
- \`{SKU}-1.jpg\` - Additional image 1
- \`{SKU}-2.jpg\` - Additional image 2

### Example:
\`\`\`
MBA-M3-8-256-SG.jpg        # Main image
MBA-M3-8-256-SG-1.jpg      # Side view
MBA-M3-8-256-SG-2.jpg      # Detail view
\`\`\`

### Your Products:

${sampleProducts.map(p => `
**${p.name}:**
${p.skus.map(sku => `- ${sku}.jpg`).join('\n')}
`).join('\n')}

### After adding images:
1. Run sync: \`.\sync-product-images.ps1\`
2. Or call API: \`POST http://localhost:5000/admin/images/sync\`

That's it! Images will be automatically mapped to products.
`;

fs.writeFileSync(path.join(imagesDir, 'README.md'), readme);
console.log('✅ Created README.md');

// Create a sample .gitkeep to keep the folder in git
fs.writeFileSync(path.join(imagesDir, '.gitkeep'), '# Keep this folder in git\n');
console.log('✅ Created .gitkeep');

// Create example filenames (empty files)
console.log('\n📝 Example filenames you should use:');
sampleProducts.forEach(product => {
  console.log(`\n${product.name}:`);
  product.skus.forEach(sku => {
    console.log(`  - ${sku}.jpg`);
    console.log(`  - ${sku}-1.jpg (optional)`);
    console.log(`  - ${sku}-2.jpg (optional)`);
  });
});

console.log('\n✅ Setup complete!');
console.log(`\n📁 Images folder: ${imagesDir}`);
console.log(`\n🚀 Next steps:`);
console.log(`   1. Add your product images to: ${imagesDir}`);
console.log(`   2. Name them according to SKU (see README.md)`);
console.log(`   3. Run: .\\sync-product-images.ps1`);
console.log(`   4. Images will be auto-mapped! 🎉`);
