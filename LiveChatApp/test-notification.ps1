# Test Push Notification Script
# Make sure a student is logged in first on http://localhost:5174

Write-Host "Testing Push Notification from Render Backend..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as admin
Write-Host "Step 1: Logging in as admin..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "https://whatsappclone-1-1r7l.onrender.com/api/admin/login" -Method Post -ContentType "application/json" -Body (@{
    adminId = "HOD001"
    password = "admin123"
} | ConvertTo-Json)

if ($loginResponse.success) {
    Write-Host "Admin logged in successfully!" -ForegroundColor Green
    $token = $loginResponse.token
    
    Write-Host ""
    Write-Host "Step 2: Sending test message..." -ForegroundColor Yellow
    
    # Step 2: Send message
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $messageBody = @{
        senderId = "HOD001"
        message = "TEST NOTIFICATION: This is a test push notification with badge count!"
        batches = @("2022-2026")
        branches = @("CSE")
        section = $null
    } | ConvertTo-Json
    
    try {
        $sendResponse = Invoke-RestMethod -Uri "https://whatsappclone-1-1r7l.onrender.com/api/messages/send" -Method Post -Headers $headers -Body $messageBody
        
        Write-Host "Test message sent successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Check your student app for notification!" -ForegroundColor Cyan
        Write-Host "- If app is OPEN: You should see a toast notification" -ForegroundColor White
        Write-Host "- If app is CLOSED: You should see a push notification with badge count" -ForegroundColor White
    } catch {
        Write-Host "Failed to send message" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
} else {
    Write-Host "Admin login failed!" -ForegroundColor Red
    Write-Host "Make sure you have created an admin account first!" -ForegroundColor Yellow
}
