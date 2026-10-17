@echo off
setlocal
rem SECTION 1: Move into this folder, even if the path contains spaces.
cd /d "%~dp0"

rem SECTION 2: Try each Python command and verify Python 3.10 or newer.
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 goto use_py
python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 goto use_python
python3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 goto use_python3

echo Python 3.10 or newer was not found.
echo Install Python and enable Add Python to PATH, then run this file again.
pause
exit /b 1

rem SECTION 3: Start Python. The server opens the correct localhost URL.
:use_py
py -3 server.py --open
goto finished

:use_python
python server.py --open
goto finished

:use_python3
python3 server.py --open

rem SECTION 4: Keep errors visible instead of closing the window immediately.
:finished
echo.
echo The server stopped. Read any error message above.
pause
endlocal
