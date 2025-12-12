# Setup Script for College Messaging System
# Run this after starting the backend server

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   College Messaging System - Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not running. Please start it first:" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm start" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Creating Default Admin Account" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Create admin
$adminData = @{
    adminId = "HOD001"
    name = "Dr. Admin"
    password = "admin123"
    department = "CSE"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/create" `
        -Method POST `
        -Body $adminData `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Admin account created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Admin ID: HOD001" -ForegroundColor White
    Write-Host "   Password: admin123" -ForegroundColor White
    Write-Host "   Department: CSE" -ForegroundColor White
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "ℹ️  Admin account already exists. Skipping..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Admin ID: HOD001" -ForegroundColor White
        Write-Host "   Password: admin123" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to create admin: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Creating Sample Students" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Sample students
$students = @(
    @{
        studentId = "ST2023001"
        name = "John Doe"
        password = "student123"
        branch = "CSE"
        startYear = 2023
        endYear = 2027
    },
    @{
        studentId = "ST2023002"
        name = "Jane Smith"
        password = "student123"
        branch = "ECE"
        startYear = 2023
        endYear = 2027
    },
    @{
        studentId = "ST2024001"
        name = "Bob Wilson"
        password = "student123"
        branch = "CSE"
        startYear = 2024
        endYear = 2028
    },
    @{
        studentId = "ST2024002"
        name = "Alice Brown"
        password = "student123"
        branch = "MECH"
        startYear = 2024
        endYear = 2028
    }
)

$successCount = 0
foreach ($student in $students) {
    try {
        $studentData = $student | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/student/register" `
            -Method POST `
            -Body $studentData `
            -ContentType "application/json" `
            -ErrorAction Stop
        
        Write-Host "✅ Created: $($student.name) ($($student.studentId)) - $($student.branch) - Batch: $($student.startYear)-$($student.endYear)" -ForegroundColor Green
        $successCount++
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 400) {
            Write-Host "ℹ️  Already exists: $($student.name) ($($student.studentId))" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to create: $($student.name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Setup Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "Created $successCount new student accounts" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎓 Student Credentials (Password: student123):" -ForegroundColor Cyan
Write-Host "   ST2023001 - John Doe      (CSE,  2023-2027)" -ForegroundColor White
Write-Host "   ST2023002 - Jane Smith    (ECE,  2023-2027)" -ForegroundColor White
Write-Host "   ST2024001 - Bob Wilson    (CSE,  2024-2028)" -ForegroundColor White
Write-Host "   ST2024002 - Alice Brown   (MECH, 2024-2028)" -ForegroundColor White
Write-Host ""

Write-Host "👨‍💼 Admin Credentials:" -ForegroundColor Cyan
Write-Host "   ID: HOD001" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Student App: http://localhost:5173" -ForegroundColor White
Write-Host "   Admin App:   http://localhost:5174" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000" -ForegroundColor White
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open Admin app and login with HOD001" -ForegroundColor White
Write-Host "   2. Open Student app and login with any student ID" -ForegroundColor White
Write-Host "   3. In Admin: Select batches/branches and send a message" -ForegroundColor White
Write-Host "   4. Check Student app to see the message instantly!" -ForegroundColor White
Write-Host ""
Write-Host "Happy messaging! 🎉" -ForegroundColor Green
