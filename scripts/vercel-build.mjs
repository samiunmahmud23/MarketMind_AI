#!/usr/bin/env node
/**
 * MarketMind AI — Vercel Build Script
 * 
 * Automatically switches Prisma schema from SQLite → PostgreSQL
 * when DATABASE_URL starts with "postgresql://" (i.e. on Vercel + Supabase).
 * 
 * vercel.json buildCommand: "node scripts/vercel-build.mjs"
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

const schemaPath = resolve('prisma/schema.prisma');

if (isPostgres) {
  console.log('🐘 PostgreSQL detected → patching Prisma schema for Supabase...');
  
  let schema = readFileSync(schemaPath, 'utf8');
  
  // Switch provider from sqlite to postgresql
  schema = schema.replace(
    /datasource db \{[\s\S]*?provider\s*=\s*"sqlite"[\s\S]*?\}/,
    `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`
  );
  
  writeFileSync(schemaPath, schema);
  console.log('✅ Schema patched to PostgreSQL');
} else {
  console.log('🗄️  SQLite detected → using local schema as-is');
}

// Generate Prisma client
console.log('\n📦 Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit' });

// Push schema to DB (creates tables if not exist)
if (isPostgres) {
  console.log('\n🚀 Pushing schema to Supabase...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
}

// Build Next.js
console.log('\n⚡ Building Next.js...');
execSync('next build', { stdio: 'inherit' });

console.log('\n✅ Build complete!');
