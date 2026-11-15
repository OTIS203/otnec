@echo off
echo ============================================
echo   NetScope DNS Setup - Run as Administrator
echo ============================================
echo.
echo Setting your PC DNS to NetScope (127.0.0.1)...
netsh interface ipv4 set dnsservers "Wi-Fi" static 127.0.0.1 primary
echo.
echo Flushing old DNS cache...
ipconfig /flushdns
echo.
echo Verifying DNS is now pointing to NetScope...
nslookup youtube.com 127.0.0.1
echo.
echo ============================================
echo   DONE! Your PC now uses NetScope DNS.
echo   Close this window and try opening YouTube
echo   or Facebook in Chrome - they should FAIL.
echo ============================================
pause

