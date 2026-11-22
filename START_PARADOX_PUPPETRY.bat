@echo off
setlocal
cd /d "%~dp0"

set "SITE_URL=http://127.0.0.1:8000/"
curl.exe --fail --silent --max-time 2 "%SITE_URL%" -o nul >nul 2>nul
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo Python 3.10 or later with the "py" launcher is required.
    pause
    exit /b 1
  )
  start "Paradox Puppetry local server" /D "%~dp0" py -u admin_server.py
)

for /L %%i in (1,1,25) do (
  curl.exe --fail --silent --max-time 2 "%SITE_URL%" -o nul >nul 2>nul
  if not errorlevel 1 goto open_site
  timeout /t 1 /nobreak >nul
)

echo Could not connect to the local site at %SITE_URL%.
echo Check the Paradox Puppetry server window for an error.
pause
exit /b 1

:open_site
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%SITE_URL%"
) else (
  start "" "%SITE_URL%"
)
exit /b 0
