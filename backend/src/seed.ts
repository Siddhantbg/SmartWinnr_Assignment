
import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User';

interface SeedUser {
  email: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
}

const seedUsers: SeedUser[] = [
  {
    email: 'admin@smartwinnr.com',
    password: 'Admin@123',
    role: 'admin',
    name: 'Admin User',
  },
  {
    email: 'user@smartwinnr.com',
    password: 'User@123',
    role: 'user',
    name: 'Regular User',
  },
];

async function seed(): Promise<void> {
  const MONGODB_URI = process.env['MONGODB_URI'];
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  for (const data of seedUsers) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      console.log(`⚠️  User already exists: ${data.email} (skipping)`);
      continue;
    }
    const user = await User.create(data);
    console.log(`✅ Created ${user.role}: ${user.email}`);
  }

  // console.log('\n Seeding complete!');
  // console.log('─────────────────────────────────────────');
  // console.log('Admin credentials:');
  // console.log('  Email   : admin@smartwinnr.com');
  // console.log('  Password: Admin@123');
  // console.log('─────────────────────────────────────────');
  // console.log('User credentials:');
  // console.log('  Email   : user@smartwinnr.com');
  // console.log('  Password: User@123');
  // console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err: Error) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
