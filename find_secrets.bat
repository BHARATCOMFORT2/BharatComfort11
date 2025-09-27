@echo off
echo ================================================
echo 🔍 Scanning project for possible secrets...
echo ================================================

REM Save all results to secrets_report.txt
(
    echo [Razorpay keys]
    findstr /S /I /N "RAZORPAY" *.*

    echo.

    echo [Firebase private keys]
    findstr /S /N "-----BEGIN PRIVATE KEY-----" *.*

    echo.

    echo [API Keys]
    findstr /S /I /N "apikey" *.*
    findstr /S /I /N "api_key" *.*

    echo.

    echo [Secrets & Tokens]
    findstr /S /I /N "secret" *.*
    findstr /S /I /N "token" *.*
    findstr /S /I /N "password" *.*

    echo.

    echo [Build Output (.next folder)]
    if exist .next (
        findstr /S /I /N "RAZORPAY" .next\*.*
        findstr /S /I /N "PRIVATE KEY" .next\*.*
    )
) > secrets_report.txt

echo ================================================
echo ✅ Scan complete! Check secrets_report.txt
echo ================================================
pause
