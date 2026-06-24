# Simplex Editor - Design Brainstorm

## Konteks Proyek
Aplikasi pengeditan foto dan video mobile-first dengan desain Dark Mode murni. Terinspirasi dari CapCut dan Wink dengan fokus pada kesederhanaan dan kecepatan.

---

## Tiga Pendekatan Desain

### 1. **Minimalist Brutalism**
Estetika raw dan direct, dengan typography bold dan spacing luas. Aksen warna terang (putih/cyan) di atas background hitam pekat.
**Probability:** 0.07

### 2. **Modern Glassmorphism**
Efek glass-frosted dengan blur dan semi-transparency, menciptakan kedalaman. Aksen warna gradient (biru ke ungu). Smooth animations dan micro-interactions.
**Probability:** 0.04

### 3. **Neon Cyberpunk** (DIPILIH)
Tema futuristik dengan aksen neon (cyan, magenta, lime) pada dark background. Typography angular dan modern. Glow effects dan sharp edges untuk kesan teknologi tinggi.
**Probability:** 0.08

---

## Desain Terpilih: Neon Cyberpunk

### Design Movement
**Cyberpunk + Futurism** — Menggabungkan estetika digital yang bold dengan sentuhan retro-futuristik. Terinspirasi dari interface sci-fi dan aplikasi editing profesional modern.

### Core Principles
1. **High Contrast & Clarity**: Warna neon yang tegas melawan background hitam untuk visibilitas maksimal
2. **Geometric Precision**: Shapes angular, borders sharp, tidak ada rounded corners yang berlebihan
3. **Speed & Directness**: Layout yang intuitif tanpa clutter, setiap elemen punya tujuan jelas
4. **Depth Through Color**: Menggunakan warna sebagai dimensi, bukan shadow atau blur

### Color Philosophy
- **Primary Background**: `#000000` (pure black) — kanvas digital yang netral
- **Accent Colors**:
  - **Cyan** (`#00D9FF`): Primary action, hover states, highlights
  - **Magenta** (`#FF00FF`): Secondary accent, alerts, emphasis
  - **Lime** (`#00FF41`): Success states, positive feedback
  - **Dark Gray** (`#1a1a1a`): Secondary surfaces, cards
- **Text**: White (`#FFFFFF`) untuk primary, `#B0B0B0` untuk secondary

### Layout Paradigm
**Vertical Stack dengan Asymmetric Accents** — Mobile-first layout yang memanfaatkan full height. Tombol dan elemen interaktif diposisikan di bottom untuk thumb accessibility. Aksen visual (glow, borders) di sisi kiri atau kanan untuk break symmetry.

### Signature Elements
1. **Neon Glow Borders**: Subtle glow pada tombol dan cards saat hover/active
2. **Geometric Dividers**: Garis angular sebagai pemisah section
3. **Animated Underlines**: Underline yang bergerak pada hover text/button

### Interaction Philosophy
- **Instant Feedback**: Setiap klik harus memberikan visual response dalam 100ms
- **Smooth Transitions**: Animasi 200-300ms untuk state changes
- **Glow on Hover**: Aksen warna meningkat brightness/glow saat hover
- **Press Animation**: Button scale down 0.95 saat ditekan

### Animation Guidelines
- Button press: 120ms scale(0.95) ease-out
- Hover effects: 200ms opacity/glow increase
- Page transitions: 250ms fade + slide
- Entrance animations: Stagger 50ms per element, fade + slide-up dari bottom

### Typography System
- **Display Font**: `Space Mono` (monospace, bold) untuk headlines — kesan futuristik
- **Body Font**: `Inter` (sans-serif, 400-500) untuk content — readability
- **Hierarchy**:
  - H1: 32px, Space Mono Bold, tracking +1px
  - H2: 24px, Space Mono Bold
  - Body: 14px, Inter Regular, line-height 1.6
  - Small: 12px, Inter Regular, opacity 0.7

### Brand Essence
**"Instant Creative Power at Your Fingertips"** — Aplikasi editing yang powerful namun intuitif, dirancang untuk creator modern yang menghargai kecepatan dan kontrol.

**Personality**: Futuristic, Direct, Empowering

### Brand Voice
- **Headlines**: Energetic, action-oriented, no fluff
- **CTAs**: Imperative, confident ("Create Now", "Edit Instantly")
- **Microcopy**: Clear, technical but accessible

**Example Lines:**
- "Your creative studio, always in your pocket"
- "Edit faster. Create better. Ship today."

### Wordmark & Logo
**Simplex Mark**: Geometric symbol combining a play button (▶) and a frame/square, rendered in cyan neon with subtle glow. Minimalist, instantly recognizable, works at any size.

### Signature Brand Color
**Cyan Neon** (`#00D9FF`) — Unmistakably Simplex, energetic, modern, dan instantly recognizable di dark backgrounds.

---

## Design Decisions untuk Development
- Gunakan CSS variables untuk warna neon agar mudah di-tweak
- Implement glow effects via `box-shadow` dengan cyan/magenta
- Mobile-first: max-width 428px (iPhone 12 Pro) untuk testing
- Semua tombol harus punya glow effect saat hover
- Typography: Import Space Mono dari Google Fonts untuk display
