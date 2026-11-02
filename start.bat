@echo off
chcp 65001 >nul
cd /d "%~dp0"
where dotnet >nul 2>&1
if errorlevel 1 (
  echo .NET 8 SDK를 설치해야 합니다.
  pause
  exit /b 1
)
dotnet run --project "SignLibraryAspNet.csproj" --no-launch-profile --urls http://127.0.0.1:8767
if errorlevel 1 (
  echo 실행에 실패했습니다. 오류를 확인하세요.
  pause
)
