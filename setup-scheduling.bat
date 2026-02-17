@echo off
echo ==========================================
echo Moving Train Chess Academy - Scheduling Setup
echo ==========================================
echo.

cd /d "%~dp0"

echo Step 1: Installing dependencies...
echo This may take a few minutes...
echo.

call npm install @supabase/supabase-js @tanstack/react-query date-fns sonner react-day-picker @radix-ui/react-label @radix-ui/react-tabs lucide-react class-variance-authority clsx tailwind-merge

if %errorlevel% neq 0 (
    echo.
    echo Installation failed. Trying with --legacy-peer-deps...
    call npm install @supabase/supabase-js @tanstack/react-query date-fns sonner react-day-picker @radix-ui/react-label @radix-ui/react-tabs lucide-react class-variance-authority clsx tailwind-merge --legacy-peer-deps
)

echo.
echo ==========================================
echo Step 2: Verifying .env.local exists...
echo ==========================================
if exist ".env.local" (
    echo .env.local found!
) else (
    echo Creating .env.local from .env.example...
    copy .env.example .env.local
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Make sure your Supabase project is created
echo 2. Run the SQL schema in Supabase SQL Editor
echo 3. Start the dev server: npm run dev
echo 4. Visit http://localhost:3000/book
echo.
pause
