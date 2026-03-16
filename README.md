# Yarboa's Blog

Personal blog powered by [Eleventy](https://www.11ty.dev/) and hosted on GitHub Pages.

**Live site**: [https://yarboa.github.io](https://yarboa.github.io/)

## Tech Stack

- **Static Site Generator**: Eleventy (11ty)
- **Template Engine**: Liquid
- **Deployment**: GitHub Actions → GitHub Pages
- **Local Development**: Podman containers (UBI9 or Fedora)

---

## Adding a New Post

### 1. Create a new file in `_posts/`

Posts must follow the naming convention: `YYYY-MM-DD-post-title.md`

**Example**: `2026-02-18-my-new-post.md`

### 2. Add frontmatter

```markdown
---
layout: post
title: "Your Post Title"
categories: category-name
---

Your post content goes here...
```

**⚠️ CRITICAL: Frontmatter Format**

The frontmatter MUST start and end with **exactly three hyphens** (`---`):

```markdown
---              ✅ Correct (3 hyphens)
layout: post
---
```

```markdown
--               ❌ Wrong (2 hyphens) - will NOT work!
layout: post
---
```

**Important fields:**
- `layout: post` - Required, tells Eleventy to use the post layout
- `title: "..."` - Your post title (use quotes)
- `categories: ...` - Used in the URL path

**Category Format:**

- **Single word**: `categories: fedora` → `/fedora/YYYY/MM/DD/title.html`
- **Multi-word (spaces)**: `categories: podman update` → `/podman/update/YYYY/MM/DD/title.html`
- **Multi-word (hyphens)**: `categories: code-quality` → `/code-quality/YYYY/MM/DD/title.html`
- **Multiple categories**: `categories: containers code-quality` → `/containers/code-quality/YYYY/MM/DD/title.html`

**Note:** Do not use commas in categories (e.g., `containers, code-quality` will fail)

### 3. Write your content

Use standard Markdown syntax. The post will be available at:
```
https://yarboa.github.io/{category}/{YYYY}/{MM}/{DD}/post-title.html
```

**Example**:
- File: `_posts/2026-02-18-my-fedora-tip.md`
- Category: `fedora`
- URL: `https://yarboa.github.io/fedora/2026/02/18/my-fedora-tip.html`

**Example with multi-word category**:
- File: `_posts/2026-03-11-sonarqube-setup-guide.md`
- Categories: `containers code-quality`
- URL: `https://yarboa.github.io/containers/code-quality/2026/03/11/sonarqube-setup-guide.html`

### 4. Preview locally (optional)

See "Running Locally" section below.

### 5. Commit and push

```bash
git add _posts/2026-02-18-my-new-post.md
git commit -m "Add new post: My New Post"
git push origin main
```

GitHub Actions will automatically build and deploy your post in ~2-3 minutes.

---

## Running Locally

You can develop locally using Podman containers or Node.js directly.

### Option 1: Using Podman Container (Recommended)

#### Quick Start

```bash
./run-eleventy-container.sh
```

This builds and runs the container, then serves the site at **http://localhost:8080**

#### Manual Container Commands

**Build the container:**

```bash
# Using Red Hat UBI 9 (recommended)
podman build -f Containerfile.eleventy -t eleventy-ubi:latest .

# OR using Fedora 40
podman build -f Containerfile.eleventy.fedora -t eleventy-fedora:latest .
```

**Run the container:**

```bash
podman run -d -u root --replace -it \
  --name eleventy-dev \
  -v $(pwd):/app:Z \
  -p 8080:8080 \
  localhost/eleventy-ubi:latest
```

**View logs:**

```bash
podman logs -f eleventy-dev
```

**Stop the container:**

```bash
podman stop eleventy-dev
```

#### Container Features

- **Hot reload**: Changes to files auto-rebuild the site
- **Live server**: Runs on http://localhost:8080
- **npm install on startup**: Dependencies installed automatically
- **Security audits**: Runs `npm audit fix --force` on startup

### Option 2: Using Node.js Directly

**Requirements**: Node.js 20+

**Install dependencies:**

```bash
npm install
```

**Run development server:**

```bash
npm run serve
```

Site available at **http://localhost:8080**

**Build only (no server):**

```bash
npm run build
```

Output goes to `_site/` directory.

---

## Project Structure

```
yarboa.github.io/
├── _posts/                    # Blog posts (YYYY-MM-DD-title.md)
├── _layouts/                  # Eleventy layouts
│   ├── default.liquid        # Base layout (header, footer)
│   ├── post.liquid           # Blog post layout
│   ├── page.liquid           # Static page layout
│   └── home.liquid           # Homepage with post list
├── assets/                    # CSS, images, etc.
│   ├── main.css              # Theme styles
│   └── custom.css            # Custom backgrounds & styling
├── _site/                     # Built site (generated, not in git)
├── .eleventy.js              # Eleventy configuration
├── .github/workflows/        # GitHub Actions
│   └── deploy.yml            # Auto-deploy workflow
├── Containerfile.eleventy    # UBI9 container
├── Containerfile.eleventy.fedora  # Fedora container
├── run-eleventy-container.sh # Container helper script
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

---

## Customization

### Changing Background

Edit `assets/custom.css` and uncomment one of the background options:

```css
/* Option 1: Purple gradient (default) */
/* Option 2: Dark tech gradient */
/* Option 3: Warm sunset gradient */
/* ... 18+ options available */
```

Or add your own image:

```css
body {
  background-image: url('/assets/your-image.jpg') !important;
  background-size: cover !important;
  background-attachment: fixed !important;
}
```

### Adjusting Content Width

Edit `assets/custom.css`:

```css
.wrapper {
  max-width: 940px !important;  /* Change this value */
}
```

### Modifying Layouts

Edit files in `_layouts/` directory:
- `default.liquid` - Site-wide structure
- `post.liquid` - Blog post template
- `home.liquid` - Homepage post listing

---

## Deployment

### Automatic (GitHub Actions)

Every push to `main` branch triggers automatic deployment:

1. GitHub Actions runs the workflow (`.github/workflows/deploy.yml`)
2. Installs Node.js and dependencies
3. Builds Eleventy site
4. Deploys to `gh-pages` branch
5. GitHub Pages serves the site

**Check deployment status**: https://github.com/Yarboa/yarboa.github.io/actions

### Manual Trigger

Go to [Actions tab](https://github.com/Yarboa/yarboa.github.io/actions) and click "Run workflow"

---

## Configuration Files

### `.eleventy.js`

Eleventy configuration:
- Input/output directories
- Template engines (Liquid, Markdown)
- Date filters
- Post collections
- Passthrough copy for assets

### `package.json`

NPM scripts:
- `npm run serve` - Development server
- `npm run build` - Build site to `_site/`
- `npm run debug` - Debug mode with verbose output
- `npm run lint` - Check markdown files for errors
- `npm run lint:fix` - Auto-fix markdown issues
- `npm run setup-hooks` - Configure git hooks

---

## Git Hooks and Markdown Linting

This project uses git hooks to ensure markdown quality before commits.

### Initial Setup

After cloning the repository, run:

```bash
npm install
npm run setup-hooks
```

This configures git to use the `.githooks/` directory.

### What the Pre-commit Hook Does

The hook automatically runs before each commit:

1. Checks staged markdown files in `_posts/`
2. Validates frontmatter format (checks for `---` delimiters)
3. Checks markdown syntax and style
4. **Blocks commit** if errors are found

### Manual Linting

**Check for errors:**
```bash
npm run lint
```

**Auto-fix issues:**
```bash
npm run lint:fix
```

**Note:** Most linting errors can be automatically fixed with `npm run lint:fix`. For errors that cannot be auto-fixed (like frontmatter delimiters), you'll need to manually correct them.

### Configuration

Linting rules are defined in `.markdownlint.json`. Key rules:

- `MD001`: Heading levels increment by one
- `MD022`: Headings should be surrounded by blank lines
- `MD047`: Files should end with a single newline
- `MD013`: Disabled (no line length limit)
- `MD033`: Disabled (allows inline HTML)

---

## Troubleshooting

### Posts not showing on homepage

1. Check file naming: `YYYY-MM-DD-title.md` format
2. Verify frontmatter has `layout: post`
3. Rebuild: `npx @11ty/eleventy`
4. Check `_site/index.html` has posts listed

### GitHub Pages shows old content

1. Verify Settings → Pages → Branch is set to **gh-pages**
2. Wait 2-3 minutes for cache to clear
3. Hard refresh browser: `Ctrl+Shift+R`

### Build fails in GitHub Actions

1. Check [Actions tab](https://github.com/Yarboa/yarboa.github.io/actions) for errors
2. Verify `package-lock.json` is committed
3. Check `.eleventy.js` syntax

### Git hook not running

If the pre-commit hook doesn't run:

```bash
# Re-run setup
npm run setup-hooks

# Verify git config
git config core.hooksPath
# Should output: .githooks

# Check hook is executable
ls -la .githooks/pre-commit
# Should show: -rwxr-xr-x
```

---

## Contributing

This is a personal blog, but issues and suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License - Feel free to use this setup for your own blog!

---

## Links

- **Live Site**: https://yarboa.github.io
- **GitHub Repo**: https://github.com/Yarboa/yarboa.github.io
- **Eleventy Docs**: https://www.11ty.dev/
- **GitHub Pages Docs**: https://docs.github.com/en/pages
