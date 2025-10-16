# PhishSense Dashboard Design Guidelines

## Design Approach
**Hybrid Approach**: Drawing from the provided landing page reference combined with dashboard best practices. The design balances PhishSense's brand identity (dark navy with cyan/teal accents) with the functional requirements of an admin dashboard.

**Reference Inspiration**: The provided landing page showcases a sophisticated dark theme with navy backgrounds and bright cyan accents - this will be our foundation.

**Design Principles**:
- Security-focused professionalism with modern appeal
- Clear data visualization hierarchy
- Efficient information scanning for administrators
- Trust-building through polished, consistent UI

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**:
- Background Primary: 220 30% 8% (Deep navy, almost black)
- Background Secondary: 220 25% 12% (Slightly lighter navy for cards/panels)
- Background Tertiary: 220 20% 16% (Sidebar, elevated surfaces)
- Primary Brand: 185 80% 55% (Bright cyan/teal - buttons, accents, links)
- Primary Hover: 185 75% 65% (Lighter cyan for interactions)
- Text Primary: 0 0% 98% (Near white for headings)
- Text Secondary: 220 15% 70% (Muted gray for body text)
- Text Tertiary: 220 10% 50% (Dimmer gray for labels)
- Success: 142 70% 50% (Green for completed status)
- Warning: 35 100% 60% (Orange for in-progress)
- Error: 0 85% 60% (Red for alerts)
- Border: 220 20% 25% (Subtle navy borders)

**Accent Colors**:
- Cyan Glow: 185 100% 60% (For data highlights, hover effects)
- Purple Accent: 260 60% 65% (Secondary accent for variety in charts)

### B. Typography

**Font Families**:
- Primary: 'Inter', sans-serif (Clean, professional, excellent for data)
- Monospace: 'JetBrains Mono', monospace (For IDs, codes, timestamps)

**Type Scale**:
- Hero/Dashboard Title: text-4xl font-bold (2.25rem, 36px)
- Section Headers: text-2xl font-semibold (1.5rem, 24px)
- Card Titles: text-lg font-semibold (1.125rem, 18px)
- Body Text: text-base font-normal (1rem, 16px)
- Small Text/Labels: text-sm font-medium (0.875rem, 14px)
- Micro Text: text-xs (0.75rem, 12px)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing: p-2, gap-2 (8px)
- Standard spacing: p-4, gap-4 (16px)
- Section spacing: p-6, gap-6 (24px)
- Large spacing: p-8, gap-8 (32px)
- Section dividers: py-12, py-16 (48-64px)

**Grid System**:
- Sidebar: Fixed width 280px (w-70)
- Main Content: flex-1 with max-w-7xl container
- Dashboard Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Project Cards: grid-cols-1 lg:grid-cols-3 gap-6

**Container Strategy**:
- Full viewport height layout (h-screen flex)
- Scrollable main content area
- Fixed sidebar and header

### D. Component Library

**Header Component**:
- Height: h-16 (64px)
- Background: bg-[220 25% 12%] with border-b border-[220 20% 25%]
- Logo: text-2xl font-bold with cyan gradient effect
- User Profile: Avatar + dropdown (right-aligned)

**Sidebar Navigation**:
- Width: 280px fixed
- Active state: bg-[220 20% 20%] with left border-l-4 border-cyan
- Icons: w-5 h-5 with text-cyan for active, text-gray for inactive
- Hover: subtle bg-[220 20% 18%] transition

**Statistics Cards**:
- Rounded corners: rounded-xl
- Background: bg-[220 25% 12%]
- Border: border border-[220 20% 25%]
- Padding: p-6
- Large number: text-3xl font-bold text-cyan
- Label: text-sm text-gray-400
- Optional icon in top-right corner

**Project Cards**:
- Similar structure to stats cards
- Status badges: rounded-full px-3 py-1 text-xs font-medium
  - In Progress: bg-orange-500/20 text-orange-400
  - Completed: bg-green-500/20 text-green-400
  - Scheduled: bg-blue-500/20 text-blue-400
- Metric display: Small labels with percentage values in cyan

**Buttons**:
- Primary: bg-cyan hover:bg-cyan-lighter text-white rounded-lg px-6 py-3
- Secondary: border border-cyan text-cyan hover:bg-cyan/10 rounded-lg px-6 py-3
- Icon buttons: p-2 hover:bg-[220 20% 20%] rounded-lg transition

**Template Cards**:
- Thumbnail preview area (aspect-ratio-16/9)
- Title + timestamp below
- Quick action buttons on hover overlay
- Border highlight on hover: border-cyan/50

**Data Tables** (for detailed views):
- Header: bg-[220 20% 16%] sticky top-0
- Rows: hover:bg-[220 20% 14%] with border-b border-[220 20% 20%]
- Alternating subtle backgrounds for readability

### E. Interaction Patterns

**Minimal Animations**:
- Smooth transitions: transition-colors duration-200
- Hover scale on cards: hover:scale-[1.02] (very subtle)
- Fade-in for new content: opacity-0 to opacity-100
- NO complex scroll animations or attention-grabbing effects

**Focus States**:
- Ring-2 ring-cyan ring-offset-2 ring-offset-[220 30% 8%]
- Clear keyboard navigation indicators

## Image Strategy

**Dashboard Icons/Graphics**:
- Use Heroicons (outline style for inactive, solid for active states)
- Phishing-themed iconography: shield-check, envelope, chart-bar, users, template
- No hero images needed for dashboard (functional interface)

**Empty States**:
- Illustrative SVG graphics from unDraw or similar (cyan color scheme)
- Center-aligned with explanatory text and CTA button below

**User Avatars**:
- Circular, 40px diameter in header
- Default placeholder with initials on colored background (cyan)

## Responsive Behavior

**Desktop (lg: 1024px+)**: Full sidebar visible, multi-column grids
**Tablet (md: 768px)**: Collapsible sidebar (hamburger menu), 2-column grids
**Mobile (base)**: Stacked layout, bottom navigation alternative, single-column cards

## Accessibility Requirements

- Maintain WCAG AA contrast ratios (minimum 4.5:1 for text)
- All form inputs with dark backgrounds: bg-[220 20% 16%] with white text
- Clear focus indicators for keyboard navigation
- Screen reader labels for icon-only buttons
- Color is never the only indicator (use icons + text)