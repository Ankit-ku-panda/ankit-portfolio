@echo off
setlocal
cd /d "%~dp0"
rem Refresh public projects and the existing local database. Internet is required.
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 goto use_py
python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 goto use_python
echo Python 3.10 or newer was not found.
pause
exit /b 1
:use_py
py -3 scripts/sync_github.py --update-db
goto finished
:use_python
python scripts/sync_github.py --update-db
:finished
echo Refresh the website to see the updated projects.
pause
endlocal
