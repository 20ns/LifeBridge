# Start backend first
Write-Host "Starting backend..."
Set-Location backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run local"

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Start frontend
Write-Host "Starting frontend..."
Set-Location ..\frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"

Write-Host "Both servers are starting..."
