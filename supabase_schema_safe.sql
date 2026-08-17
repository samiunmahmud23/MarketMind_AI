-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'website',
    "title" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "scores" TEXT,
    "meta" TEXT,
    "report" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendations" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productDesc" TEXT,
    "targetAudience" TEXT NOT NULL,
    "valueProp" TEXT,
    "goal" TEXT NOT NULL DEFAULT 'leads',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "seoKeywords" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draftCount" INTEGER NOT NULL DEFAULT 2,
    "productImage" TEXT,
    "productImageDesc" TEXT,
    "selectedVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Recipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "leadScore" INTEGER,
    "leadTier" TEXT,
    "leadFit" TEXT,
    "sentSubject" TEXT,
    "sentBody" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SocialCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "brand" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "url" TEXT,
    "goal" TEXT NOT NULL DEFAULT 'engagement',
    "platforms" TEXT NOT NULL,
    "contentPillars" TEXT,
    "hashtagBank" TEXT,
    "strategy" TEXT,
    "cadence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SocialPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT,
    "cta" TEXT,
    "imagePrompt" TEXT,
    "bestTime" TEXT,
    "estReach" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailVariant" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "body" TEXT NOT NULL,
    "cta" TEXT,
    "strategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SeoReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "domain" TEXT,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT,
    "issues" TEXT,
    "keywords" TEXT,
    "onPageAudit" TEXT,
    "recommendations" TEXT NOT NULL,
    "actionPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CopyAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "platform" TEXT,
    "angle" TEXT,
    "variants" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "brand" TEXT,
    "audience" TEXT,
    "keywords" TEXT,
    "outline" TEXT,
    "content" TEXT NOT NULL,
    "title" TEXT,
    "metaDesc" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "audience" TEXT,
    "valueProp" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "voice" TEXT,
    "keywords" TEXT,
    "primaryColor" TEXT,
    "logoUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RepurposeProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "sourceContent" TEXT NOT NULL,
    "brand" TEXT,
    "audience" TEXT,
    "outputs" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepurposeProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SmtpConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT,
    "pass" TEXT,
    "web3formsKey" TEXT,
    "fromName" TEXT NOT NULL DEFAULT 'MarketMind AI',
    "fromEmail" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiSeoReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "domain" TEXT,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT,
    "aiVisibility" TEXT,
    "recommendations" TEXT,
    "report" TEXT NOT NULL,
    "llmsTxt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSeoReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompetitorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "domain" TEXT,
    "description" TEXT,
    "profile" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CroReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "pageType" TEXT,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT,
    "issues" TEXT,
    "report" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CroReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SchemaReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "pageType" TEXT,
    "jsonLd" TEXT NOT NULL,
    "existingAudit" TEXT,
    "report" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subStatus" TEXT NOT NULL DEFAULT 'active',
    "analysesUsed" INTEGER NOT NULL DEFAULT 0,
    "campaignsUsed" INTEGER NOT NULL DEFAULT 0,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "aiCallsUsed" INTEGER NOT NULL DEFAULT 0,
    "usageResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduledJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductPhotography" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "productName" TEXT NOT NULL,
    "headline" TEXT,
    "style" TEXT NOT NULL,
    "originalImage" TEXT,
    "generatedImage" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPhotography_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analysis_userId_idx" ON "Analysis"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analysis_url_idx" ON "Analysis"("url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipient_userId_idx" ON "Recipient"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipient_campaignId_idx" ON "Recipient"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipient_email_idx" ON "Recipient"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipient_leadTier_idx" ON "Recipient"("leadTier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialCampaign_userId_idx" ON "SocialCampaign"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialCampaign_brand_idx" ON "SocialCampaign"("brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialPost_userId_idx" ON "SocialPost"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialPost_campaignId_idx" ON "SocialPost"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialPost_platform_idx" ON "SocialPost"("platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailVariant_userId_idx" ON "EmailVariant"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailVariant_campaignId_idx" ON "EmailVariant"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SeoReport_userId_idx" ON "SeoReport"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SeoReport_url_idx" ON "SeoReport"("url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CopyAsset_userId_idx" ON "CopyAsset"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentProject_userId_idx" ON "ContentProject"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BrandProfile_userId_idx" ON "BrandProfile"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BrandProfile_isDefault_idx" ON "BrandProfile"("isDefault");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepurposeProject_userId_idx" ON "RepurposeProject"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepurposeProject_sourceType_idx" ON "RepurposeProject"("sourceType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SmtpConfig_userId_idx" ON "SmtpConfig"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SmtpConfig_isDefault_idx" ON "SmtpConfig"("isDefault");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiSeoReport_userId_idx" ON "AiSeoReport"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiSeoReport_url_idx" ON "AiSeoReport"("url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CompetitorProfile_userId_idx" ON "CompetitorProfile"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CompetitorProfile_url_idx" ON "CompetitorProfile"("url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CroReport_userId_idx" ON "CroReport"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CroReport_url_idx" ON "CroReport"("url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SchemaReport_userId_idx" ON "SchemaReport"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SchemaReport_url_idx" ON "SchemaReport"("url");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_subscriptionTier_idx" ON "User"("subscriptionTier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledJob_userId_idx" ON "ScheduledJob"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledJob_status_idx" ON "ScheduledJob"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledJob_scheduledFor_idx" ON "ScheduledJob"("scheduledFor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductPhotography_userId_idx" ON "ProductPhotography"("userId");

-- AddForeignKey
DO $ BEGIN
  ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

-- AddForeignKey
DO $ BEGIN
  ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SocialCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

-- AddForeignKey
DO $ BEGIN
  ALTER TABLE "EmailVariant" ADD CONSTRAINT "EmailVariant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

-- AddForeignKey
DO $ BEGIN
  ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;


