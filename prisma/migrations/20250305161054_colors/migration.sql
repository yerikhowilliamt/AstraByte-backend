/*
  Warnings:

  - A unique constraint covering the columns `[user_id,street,city,province,country,postal_code]` on the table `addresses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[store_id,name]` on the table `banners` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "colors" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colors_name_key" ON "colors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "colors_value_key" ON "colors"("value");

-- CreateIndex
CREATE INDEX "colors_store_id_idx" ON "colors"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_user_id_street_city_province_country_postal_code_key" ON "addresses"("user_id", "street", "city", "province", "country", "postal_code");

-- CreateIndex
CREATE UNIQUE INDEX "banners_store_id_name_key" ON "banners"("store_id", "name");

-- AddForeignKey
ALTER TABLE "colors" ADD CONSTRAINT "colors_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
