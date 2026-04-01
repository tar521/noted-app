Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -WindowStyle Hidden -Command ""Set-Location 'C:\Users\trist\Desktop\Portable\Notes_Project\noted-app'; npm run dev""", 0, False
