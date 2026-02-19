-- CreateIndex
CREATE INDEX "AirtableTable_baseId_idx" ON "AirtableTable"("baseId");

-- CreateIndex
CREATE INDEX "Base_userId_idx" ON "Base"("userId");

-- CreateIndex
CREATE INDEX "Column_tableId_order_idx" ON "Column"("tableId", "order");

-- CreateIndex
CREATE INDEX "View_tableId_order_idx" ON "View"("tableId", "order");
