@echo off
setlocal enabledelayedexpansion
title 🔒 Ashtakavarga Backup & Restore Tool

set "PROJECT_PATH=D:\Jamakkol application\JAmakkol\JAmakkol"

pushd "%PROJECT_PATH%" || (
    echo ❌ ERROR: Project path not found!
    pause
    exit /b
)

echo ===============================================
echo       🌕 ASHTAKAVARGA BACKUP / RESTORE TOOL
echo ===============================================
echo.
echo Choose an option:
echo 1. Backup current working files
echo 2. Restore last stable backup
echo 3. Exit
echo.
set /p choice=Enter your choice (1/2/3): 

if "%choice%"=="1" goto backup
if "%choice%"=="2" goto restore
if "%choice%"=="3" exit
goto end

:backup
echo.
if not exist "backups" mkdir "backups"

set "timestamp=%date:~10,4%_%date:~4,2%_%date:~7,2%_%time:~0,2%_%time:~3,2%"
set "timestamp=!timestamp: =0!"
set "timestamp=!timestamp::=!"

echo 🔄 Backing up files to: "%PROJECT_PATH%\backups"
echo.

REM ==== Check for file existence ====
if not exist "%PROJECT_PATH%\app.py" echo ❌ Missing: app.py
if not exist "%PROJECT_PATH%\ashtakavarga_calc.py" echo ❌ Missing: ashtakavarga_calc.py
if not exist "%PROJECT_PATH%\ashtakavarga.js" echo ❌ Missing: ashtakavarga.js

if not exist "%PROJECT_PATH%\app.py" goto missing
if not exist "%PROJECT_PATH%\ashtakavarga_calc.py" goto missing
if not exist "%PROJECT_PATH%\ashtakavarga.js" goto missing

copy "%PROJECT_PATH%\app.py" "backups\app_stable_!timestamp!.py" >nul
copy "%PROJECT_PATH%\ashtakavarga_calc.py" "backups\ashtakavarga_stable_!timestamp!.py" >nul
copy "%PROJECT_PATH%\ashtakavarga.js" "backups\ashtakavarga_stable_!timestamp!.js" >nul

echo ✅ Backup complete! Timestamp: !timestamp!
pause
popd
exit

:missing
echo.
echo ⚠️ One or more files were missing. Check the folder path above.
pause
popd
exit

:restore
echo.
if not exist "backups" (
    echo ❌ No backups found.
    pause
    popd
    exit
)
echo Available backups:
dir "backups\*.py"
echo.
set /p restore_stamp=Enter timestamp (example: 2025_11_05_09_45): 

echo 🔁 Restoring selected version...
copy "backups\app_stable_%restore_stamp%.py" "%PROJECT_PATH%\app.py" >nul
copy "backups\ashtakavarga_stable_%restore_stamp%.py" "%PROJECT_PATH%\ashtakavarga_calc.py" >nul
copy "backups\ashtakavarga_stable_%restore_stamp%.js" "%PROJECT_PATH%\ashtakavarga.js" >nul

if errorlevel 1 (
    echo ❌ Restore failed — check timestamp.
) else (
    echo ✅ Restore complete!
)
pause
popd
exit

:end
popd
exit
