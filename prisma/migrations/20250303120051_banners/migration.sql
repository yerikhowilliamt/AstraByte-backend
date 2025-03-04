-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "public_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_store_id_idx" ON "banners"("store_id");

-- CreateIndex
CREATE INDEX "banners_public_id_idx" ON "banners"("public_id");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
