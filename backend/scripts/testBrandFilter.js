import mongoose from 'mongoose';
import 'dotenv/config';
import Product from '../models/Product.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const testBrands = ['SKLP Heritage', 'SKLP Royale', 'SKLP Footwear'];
  
  for (const b of testBrands) {
    const brandRegexes = [new RegExp('^' + b + '$', 'i')];
    const prods = await Product.find({ isActive: true, brand: { $in: brandRegexes } });
    console.log(`Brand [${b}]: found ${prods.length} products:`);
    prods.forEach(p => console.log(`   - ${p.name} (Brand: ${p.brand})`));
  }
  
  await mongoose.disconnect();
}

test();
