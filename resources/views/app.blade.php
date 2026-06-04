<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'Tava') }}</title>

    {{-- Anti-FOUC: pick the theme BEFORE React mounts so we never flash the wrong palette. --}}
    <script>
        (function () {
            try {
                var stored = localStorage.getItem('tava.theme');
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var dark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
                if (dark) document.documentElement.classList.add('dark');
            } catch (e) { /* ignore — fall back to light */ }
        })();
    </script>

    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
</head>
<body class="h-full bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
    <div id="root" class="h-full"></div>
</body>
</html>
