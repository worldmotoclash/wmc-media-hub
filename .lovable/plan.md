

# Fix: Navbar turning white on scroll

The Navbar applies `bg-white/80` when scrolled (line 39). On the Media Hub page with its dark hero, this creates a jarring white header.

## Change

**`src/components/Navbar.tsx`** — Replace the scrolled background class from `bg-white/80` to a dark translucent background that matches the dark theme of the Media Hub:

- Change `bg-white/80 backdrop-blur-md shadow-sm` to `bg-background/80 backdrop-blur-md shadow-sm`

This uses the CSS variable `--background` which adapts to light/dark theme, keeping the header consistent with the page's color scheme instead of hardcoding white.

