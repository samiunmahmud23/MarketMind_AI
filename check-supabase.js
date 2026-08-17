require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  try {
    const userCount = await db.user.count();
    const analysisCount = await db.analysis.count();
    const campaignCount = await db.campaign.count();
    const seoCount = await db.seoReport.count();

    console.log('✅ Connected to Supabase PostgreSQL!');
    console.log('   Users:      ' + userCount);
    console.log('   Analyses:   ' + analysisCount);
    console.log('   Campaigns:  ' + campaignCount);
    console.log('   SEO Reports:' + seoCount);

    const tables = await db.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('\n📊 Tables in Supabase (' + tables.length + ' total):');
    tables.forEach(t => console.log('   ✓ ' + t.table_name));
    console.log('\n🎉 Database migration COMPLETE!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await db.$disconnect();
  }
})();
