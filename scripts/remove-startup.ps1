$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "MealApp.lnk"

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath
    Write-Output "Removed MealApp from Windows Startup."
} else {
    Write-Output "MealApp was not found in Windows Startup."
}
