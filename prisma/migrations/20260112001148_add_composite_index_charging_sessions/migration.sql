-- CreateIndex
CREATE INDEX "chargingSessions_workspaceId_status_startTime_idx" ON "chargingSessions"("workspaceId", "status", "startTime");
