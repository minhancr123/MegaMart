# Dark Mode Batch Update Script
# Run this in PowerShell from MegaMart/client directory

Write-Host "🌙 Starting Dark Mode Batch Update..." -ForegroundColor Cyan

# Define search and replace patterns
$patterns = @(
    @{
        Search = 'className="([^"]*)\bbg-white\b([^"]*)"'
        Replace = 'className="$1bg-white dark:bg-gray-900$2"'
        Description = "Background: white → gray-900"
    },
    @{
        Search = 'className="([^"]*)\bbg-gray-50\b([^"]*)"'
        Replace = 'className="$1bg-gray-50 dark:bg-gray-800$2"'
        Description = "Background: gray-50 → gray-800"
    },
    @{
        Search = 'className="([^"]*)\bbg-gray-100\b([^"]*)"'
        Replace = 'className="$1bg-gray-100 dark:bg-gray-950$2"'
        Description = "Background: gray-100 → gray-950"
    },
    @{
        Search = 'className="([^"]*)\btext-gray-900\b([^"]*)"'
        Replace = 'className="$1text-gray-900 dark:text-white$2"'
        Description = "Text: gray-900 → white"
    },
    @{
        Search = 'className="([^"]*)\btext-gray-700\b([^"]*)"'
        Replace = 'className="$1text-gray-700 dark:text-gray-200$2"'
        Description = "Text: gray-700 → gray-200"
    },
    @{
        Search = 'className="([^"]*)\btext-gray-600\b([^"]*)"'
        Replace = 'className="$1text-gray-600 dark:text-gray-400$2"'
        Description = "Text: gray-600 → gray-400"
    },
    @{
        Search = 'className="([^"]*)\btext-gray-500\b([^"]*)"'
        Replace = 'className="$1text-gray-500 dark:text-gray-500$2"'
        Description = "Text: gray-500 → gray-500 (no change)"
    },
    @{
        Search = 'className="([^"]*)\bborder-gray-200\b([^"]*)"'
        Replace = 'className="$1border-gray-200 dark:border-gray-800$2"'
        Description = "Border: gray-200 → gray-800"
    },
    @{
        Search = 'className="([^"]*)\bborder-gray-300\b([^"]*)"'
        Replace = 'className="$1border-gray-300 dark:border-gray-700$2"'
        Description = "Border: gray-300 → gray-700"
    }
)

# Files to process (add more as needed)
$filesToProcess = @(
    "src\components\CategoryMenu.tsx",
    "src\components\ScrollToTop.tsx",
    "src\app\home\page.tsx",
    "src\app\product\[id]\page.tsx",
    "src\app\category\[slug]\page.tsx",
    "src\app\checkout\page.tsx",
    "src\app\wishlist\page.tsx",
    "src\app\compare\page.tsx",
    "src\app\news\page.tsx",
    "src\app\news\[id]\page.tsx",
    "src\app\admin\page.tsx",
    "src\app\admin\products\page.tsx",
    "src\app\admin\categories\page.tsx",
    "src\app\admin\orders\page.tsx",
    "src\app\admin\orders\[id]\page.tsx",
    "src\app\admin\users\page.tsx",
    "src\app\admin\analytics\page.tsx",
    "src\app\admin\flash-sales\[id]\page.tsx",
    "src\app\admin\audit-logs\page.tsx",
    "src\components\cart\CartList.tsx",
    "src\components\cart\CartSummary.tsx"
)

$totalReplacements = 0
$filesModified = 0

foreach ($file in $filesToProcess) {
    if (Test-Path $file) {
        Write-Host "`n📝 Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) {
            Write-Host "  ⚠️  Could not read file" -ForegroundColor Red
            continue
        }
        
        $modified = $false
        $fileReplacements = 0
        
        foreach ($pattern in $patterns) {
            $regex = [regex]::new($pattern.Search)
            $matches = $regex.Matches($content)
            
            if ($matches.Count -gt 0) {
                $content = $regex.Replace($content, $pattern.Replace)
                $fileReplacements += $matches.Count
                $modified = $true
                Write-Host "  ✓ $($pattern.Description): $($matches.Count) replacements" -ForegroundColor Green
            }
        }
        
        if ($modified) {
            Set-Content -Path $file -Value $content -NoNewline
            $filesModified++
            $totalReplacements += $fileReplacements
            Write-Host "  ✅ File updated ($fileReplacements total replacements)" -ForegroundColor Green
        } else {
            Write-Host "  ℹ️  No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n⚠️  File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "🎉 Dark Mode Update Complete!" -ForegroundColor Green
Write-Host "📊 Statistics:" -ForegroundColor Cyan
Write-Host "  • Files modified: $filesModified" -ForegroundColor White
Write-Host "  • Total replacements: $totalReplacements" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host "`n💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test dark mode in browser (toggle Light/Dark/System)" -ForegroundColor White
Write-Host "  2. Check for any visual issues" -ForegroundColor White
Write-Host "  3. Manually review hover states and gradients" -ForegroundColor White
Write-Host "  4. Update any custom styled components" -ForegroundColor White

Write-Host "`n🚀 Run 'npm run dev' to test changes" -ForegroundColor Cyan
