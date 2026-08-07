# setup_cycle_scheduler.ps1
# Registers Windows Task Scheduler task to run autonomous_cycle.py every 30 minutes
# Run ONCE from an elevated (Admin) PowerShell prompt:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\ztuch\petroleum-fiscal-db\setup_cycle_scheduler.ps1"

$TaskName    = "PetroleumCycleAutonomous"
$PythonPath  = "C:\Users\ztuch\AppData\Local\Programs\Python\Python312\python.exe"
$ScriptPath  = "C:\Users\ztuch\petroleum-fiscal-db\autonomous_cycle.py"
$LogPath     = "C:\Users\ztuch\petroleum-fiscal-db\cycle_log.txt"
$WorkDir     = "C:\Users\ztuch\petroleum-fiscal-db"

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Action: run python autonomous_cycle.py, append output to log
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$PythonPath`" `"$ScriptPath`" >> `"$LogPath`" 2>&1" `
    -WorkingDirectory $WorkDir

# Trigger: start now, repeat every 30 minutes indefinitely
$StartTime = (Get-Date).AddMinutes(1)
$Trigger = New-ScheduledTaskTrigger `
    -Once `
    -At $StartTime `
    -RepetitionInterval (New-TimeSpan -Minutes 30) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

# Settings
$Settings = New-ScheduledTaskSettingsSet `
    -DisallowStartIfOnBatteries $false `
    -StopIfGoingOnBatteries $false `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -MultipleInstances IgnoreNew `
    -Hidden $false `
    -StartWhenAvailable $true

# Register — runs as current user (S4U logon, no password needed, no desktop session required)
Register-ScheduledTask `
    -TaskName        $TaskName `
    -Description     "Petroleum Platform: autonomous 30-min improvement cycle (grader, agents, test, email)" `
    -Action          $Action `
    -Trigger         $Trigger `
    -Settings        $Settings `
    -RunLevel        Highest `
    -Force

Write-Host ""
Write-Host "SUCCESS: Task '$TaskName' created." -ForegroundColor Green
Write-Host "  Runs every 30 minutes starting $StartTime" -ForegroundColor Cyan
Write-Host "  Log: $LogPath" -ForegroundColor Cyan
Write-Host "  To remove: Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT STEP: Run claude /login to refresh auth token before leaving." -ForegroundColor Magenta
