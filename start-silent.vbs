Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\fares\Downloads\meal"
WshShell.Run "cmd /c npm run dev", 0, False
