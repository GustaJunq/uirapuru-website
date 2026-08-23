@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: var(--font-geist), "Geist Fallback", sans-serif;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-account: var(--account);
  --color-account-foreground: var(--account-foreground);
  --radius-sm: calc(var(--radius) * .6);
  --radius-md: calc(var(--radius) * .8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  color-scheme: dark;
  --background: #0b0b0b;
  --foreground: #f4f4ef;
  --card: #151515;
  --card-foreground: #f4f4ef;
  --popover: #151515;
  --popover-foreground: #f4f4ef;
  --primary: #54ff00;
  --primary-foreground: #0b0b0b;
  --secondary: #292929;
  --secondary-foreground: #f4f4ef;
  --muted: #292929;
  --muted-foreground: #858585;
  --accent: #292929;
  --accent-foreground: #f4f4ef;
  --destructive: #54ff00;
  --border: #515151;
  --input: #515151;
  --ring: #54ff00;
  --account: #003f22;
  --account-foreground: #f4f4ef;
  --radius: .75rem;
}

@layer base {
  * { @apply border-border outline-ring/50; }
  html, body { min-height: 100%; }
  body { @apply bg-background text-foreground; }
  button, a, input { -webkit-tap-highlight-color: transparent; }
}

.composer {
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
  min-height: 58px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #101010;
  box-shadow: 0 0 0 1px rgb(84 255 0 / 8%), 0 12px 38px rgb(0 0 0 / 30%), 0 0 24px rgb(84 255 0 / 17%);
  transition: border-color .22s ease, box-shadow .22s ease, transform .22s ease;
}
.composer:focus-within {
  border-color: #73856c;
  box-shadow: 0 0 0 1px rgb(84 255 0 / 14%), 0 16px 46px rgb(0 0 0 / 34%), 0 0 30px rgb(84 255 0 / 24%);
  transform: translateY(-1px);
}

.brand-logo { filter: none; }
.chat-scroll { scrollbar-width: thin; scrollbar-color: var(--secondary) transparent; }

.hero-enter {
  animation: hero-enter .55s cubic-bezier(.22, 1, .36, 1) both;
}

@keyframes hero-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 767px) {
  header { flex-wrap: wrap; gap: .75rem; }
  header nav { order: 2; width: 100%; }
  .brand-logo { width: 11rem; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
