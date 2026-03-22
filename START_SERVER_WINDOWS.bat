@echo off
:: ================================================================
:: OBS Scene Switcher Server Launcher (Windows)
:: ================================================================

setlocal

set SCRIPT_DIR=%~dp0

echo ================================================
echo   OBS Scene Switcher Server
echo ================================================
echo.
echo Starting server from: %SCRIPT_DIR%
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :node_missing
goto :start_server

:node_missing
echo Node.js is not installed. This software will not work without it.
echo.
set /p INSTALL_CHOICE="Would you like to download and install it now? (requires admin privileges) [Y/N]: "
echo.
if /i "%INSTALL_CHOICE%"=="Y" goto :install_node
if /i "%INSTALL_CHOICE%"=="YES" goto :install_node
echo Installation skipped. Please install Node.js manually from https://nodejs.org/
echo.
pause
exit /b 1

:install_node
echo Looking up latest Node.js LTS version...
powershell -NoProfile -Command ^
  "$ErrorActionPreference='Stop';" ^
  "try {" ^
  "  $res = Invoke-WebRequest -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing;" ^
  "  $ver = ($res.Content | ConvertFrom-Json | Where-Object { $_.lts } | Select-Object -First 1).version;" ^
  "  $url = \"https://nodejs.org/dist/$ver/node-$ver-x64.msi\";" ^
  "  Write-Host \"Downloading Node.js $ver...\";" ^
  "  Invoke-WebRequest -Uri $url -OutFile '%TEMP%\node_installer.msi' -UseBasicParsing;" ^
  "  Write-Host 'Download complete.';" ^
  "} catch { Write-Host \"ERROR: $_\"; exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Download failed. Please install Node.js manually from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo Installing Node.js... (a UAC prompt may appear)
echo.
msiexec /i "%TEMP%\node_installer.msi" /passive /norestart
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation failed. Please install Node.js manually from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Refresh PATH from registry so this session can find node
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%B"
if defined USR_PATH (set "PATH=%SYS_PATH%;%USR_PATH%") else (set "PATH=%SYS_PATH%")

:: Verify Node.js is now accessible
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    :: Try the default install location as fallback
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo.
        echo [ERROR] Node.js was installed but could not be found in PATH.
        echo Please close this window, reopen it, and run this script again.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Node.js installed successfully!
echo.

:start_server
:: Check if server file exists
if not exist "%SCRIPT_DIR%oss_server.js" (
    echo [ERROR] oss_server.js not found in %SCRIPT_DIR%
    echo.
    pause
    exit /b 1
)

:: Start the server
node "%SCRIPT_DIR%oss_server.js"

:: If server exits with an error, show error message
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    echo.
)

pause
endlocal
