-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "BillingCurrency" AS ENUM ('USD', 'PKR');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('payoneer', 'jazzcash', 'easypaisa', 'manual');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_provider" "PaymentProvider",
ADD COLUMN     "transaction_reference" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "base_monthly_price" INTEGER,
ADD COLUMN     "billing_currency" "BillingCurrency",
ADD COLUMN     "child_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "coupon_code" TEXT,
ADD COLUMN     "discount_amount" INTEGER,
ADD COLUMN     "discount_percentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "final_amount" INTEGER,
ADD COLUMN     "plan_type" "SubscriptionPlanType",
ADD COLUMN     "pricing_metadata" JSONB DEFAULT '{}',
ADD COLUMN     "started_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "subscriptions_child_count_idx" ON "subscriptions"("child_count");

-- CreateIndex
CREATE INDEX "subscriptions_plan_type_idx" ON "subscriptions"("plan_type");
