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
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if server file exists
if not exist "%SCRIPT_DIR%oss_server.js" (
    echo [ERROR] oss_server.js not found in %SCRIPT_DIR%
    echo.
    pause
    exit /b 1
)

:: Start the server
node "%SCRIPT_DIR%oss_server.js"

:: If server exits, pause so user can see any error messages
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    echo.
    pause
)

endlocal
