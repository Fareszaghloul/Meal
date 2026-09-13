$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "MealApp.lnk"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"c:\Users\fares\Downloads\meal\start-silent.vbs`""
$shortcut.WorkingDirectory = "c:\Users\fares\Downloads\meal"
$shortcut.Description = "Meal Planner Local Server"
$shortcut.Save()

Write-Output "Startup shortcut created successfully at $shortcutPath"
