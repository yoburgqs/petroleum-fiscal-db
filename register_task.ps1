$TaskName   = "PetroleumCycleAutonomous"
$PythonPath = "C:\Users\ztuch\AppData\Local\Programs\Python\Python312\python.exe"
$ScriptPath = "C:\Users\ztuch\petroleum-fiscal-db\autonomous_cycle.py"
$LogPath    = "C:\Users\ztuch\petroleum-fiscal-db\cycle_log.txt"
$WorkDir    = "C:\Users\ztuch\petroleum-fiscal-db"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$cmd = "/c `"$PythonPath`" `"$ScriptPath`" >> `"$LogPath`" 2>&1"
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $cmd -WorkingDirectory $WorkDir

$StartTime = (Get-Date).AddMinutes(2)
$Trigger = New-ScheduledTaskTrigger -Once -At $StartTime -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)

$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew -StartWhenAvailable

$Task = Register-ScheduledTask -TaskName $TaskName -Description "Petroleum 30-min autonomous cycle" -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force

if ($Task) {
    Write-Host "REGISTERED: $TaskName — State: $($Task.State)" -ForegroundColor Green
} else {
    Write-Host "FAILED to register task" -ForegroundColor Red
}
