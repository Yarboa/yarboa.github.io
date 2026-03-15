---
layout: post
title:  "Local SonarQube Setup for Code Quality Analysis"
categories: containers code-quality
---

## How to setup SonarQube locally for code quality

SonarQube is a powerful code quality and security analysis tool.  
This guide shows you how to:
 - set it up locally.
 - execute scans.
 
## Why should you care?

SonarQube automatically analyzes code pytest coverage XML and tracks
Coverage of code blocks. 
It also detects:
 - security vulnerabilities like SQL injection.hardcoded secrets.
 - measures code quality metrics such as cognitive complexity and code duplication.
 - coverage level.

This continuous analysis helps maintain clean, secure, and maintainable code without manual review of coverage reports.

## How it works?

SonarQube operates on a client-server model:  
 - SonarQube server that stores analysis results and quality metrics.  
 - Scanner client (CLI tool or container) analyzes your code locally.  
 
Client uploades analysis results to the server.
In case server threshold is low, client will complete with failure

To view analysis results the server contains Web UI

SonarQube has a Developer/Enterprise editions.
The Developer/ Community eddition is Free and Open Source Software, FOSS

## Scope

This guide focuses exclusively on Free and Open Source Software (FOSS) edition, demonstrating SonarQube using Podman containers and the Community Edition server.  
All tools and configurations shown are freely available and can be used in production without licensing costs. For a detailed comparison of Community vs Enterprise features and workarounds for Community Edition limitations, see [Understanding Pull Request vs Main Branch Analysis](#understanding-pull-request-vs-main-branch-analysis).

## Running SonarQube Server Locally

SonarQube runs as a server that receives scan results. The easiest way to run it locally is using containers.

### Start SonarQube Server

```bash
# Using Podman
podman run -d --replace --name sonarqube -p 9000:9000 sonarqube:latest
```

Wait for the server to start (this can take 1-2 minutes):

```bash
# Watch the last 20 lines of logs until you see "SonarQube is operational"
podman logs -f --tail 20 sonarqube
```

When you see "SonarQube is operational", it's ready. Press `Ctrl+C` to exit the logs.

### Initial Setup

1. Open http://localhost:9000 in your browser
2. Login with default credentials: `admin` / `admin`
3. Change the default password:

   **Using the API (for automation)**
   ```bash
   curl -u admin:admin -X POST "http://localhost:9000/api/users/change_password?login=admin&previousPassword=admin&password=NewPassword@123"
   ```

4. Create a new project:
   - Login admin + password
   - Click "Create Project" > "Manually"
   - Enter a Project Key (e.g., `test-project`)
   - Click "Set Up"

5. Generate an authentication token:

   **Option A: Using the Web UI**
   - Go to Administration > Security > Users
   - Click on the token icon for the admin user
   - Enter a token name (e.g., `admin-token`)
   - Choose token type (Global Analysis Token for scanning)
   - Click "Generate" and **save the token** - you'll need it for scanning

   **Option B: Using the API (for automation)**
   ```bash
   # Generate a new token
   curl -u admin:NewPassword@123 -X POST \
     "http://localhost:9000/api/user_tokens/generate?name=remote_automation_token&type=GLOBAL_ANALYSIS_TOKEN" | jq .
   ```

   Response example:
   ```json
   {
     "login": "admin",
     "name": "remote_automation_token",
     "token": "squ_a1b2c3d4e5f6g7h8i9j0",
     "createdAt": "2026-03-01T10:30:00+0000"
   }
   ```

   **Save the token value** - it won't be shown again!

   **To revoke a token:**
   ```bash
   curl -u admin:NewPassword123 -X POST \
     "http://localhost:9000/api/user_tokens/revoke?name=remote_automation_token"
   ```

   **To list all tokens:**
   ```bash
   curl -u admin:NewPassword123 \
     "http://localhost:9000/api/user_tokens/search" | jq .
   ```

## Scanning repository

### Create sonar-project.properties

In your repository root, create or update `sonar-project.properties`:

```properties
sonar.projectKey=test-project
sonar.projectName=test-project
sonar.host.url=http://localhost:9000

# Source code configuration
sonar.sources=src
sonar.tests=tests

# Python-specific settings
sonar.language=py
sonar.python.version=3.9

# Coverage report location
sonar.python.coverage.reportPaths=coverage.xml
```

**Note:** You can add exclusions if needed:
```properties
# Exclusions (optional)
sonar.exclusions=**/tests/**,**/*_test.py,**/test_*.py,**/__pycache__/**,**/*.pyc
```

### Generate Test Coverage (Optional but Recommended)

Before scanning, generate a coverage report to track code quality:

```bash
# Install pytest-cov using uv
uv pip install pytest-cov

# Run tests with coverage
uv run pytest tests/ -v --cov=src --cov-report=xml:coverage.xml --cov-report=term
```

This generates `coverage.xml` which SonarQube will include in the analysis.

### Scan Using CLI

Use containerized scanner (no installation needed) - Recommended**

```bash
# Set your token as an environment variable
export TOKEN=your_sonarqube_token_here

# Run scanner in container
# IMPORTANT: Mount at the same path as your working directory for coverage to work
podman run --rm \
  -v $(pwd):$(pwd):z \
  -w $(pwd) \
  --network host \
  sonarsource/sonar-scanner-cli \
  -Dsonar.token=$TOKEN
```

The scanner will automatically use your `sonar-project.properties` configuration.

**Why the volume mount path matters:**
The container must see files at the same absolute paths as referenced in `coverage.xml`. If coverage.xml contains paths like `/home/user/project/src/file.py`, the container must also see files at `/home/user/project/src/file.py` - not `/usr/src/src/file.py`. Using `-v $(pwd):$(pwd):z` ensures path matching, which is critical for coverage reporting to work correctly.

**Complete workflow example:**
```bash
# 1. Generate coverage
uv pip install pytest-cov
uv run pytest tests/ -v --cov=src --cov-report=xml:coverage.xml --cov-report=term

# 2. Set token
export TOKEN=your_sonarqube_token_here

# 3. Run SonarQube scan (use matching paths for coverage)
podman run --rm \
  -v $(pwd):$(pwd):z \
  -w $(pwd) \
  --network host \
  sonarsource/sonar-scanner-cli \
  -Dsonar.token=$TOKEN
```

### View Results

After scanning completes, view the results at http://localhost:9000

## Advanced: Usage of SonarQube in CI/CD Workflow

The following sections describe advanced integration scenarios with CI/CD pipelines. These features require either SonarQube Developer/Enterprise Edition or automated workflows in your CI/CD platform.

### Understanding Pull Request vs Main Branch Analysis

SonarQube performs two different types of analysis depending on when it runs:

### Pull Request Analysis (Differential Scan)
- **Scans only the changed files** - analyzes just the code you modified in the PR
- **Fast and focused** - shows only new issues introduced by your changes
- **Prevents new technical debt** - blocks PRs that don't meet quality standards
- **Does NOT update** the main project metrics

**What gets analyzed:**
```
Your PR changes 2 files out of 100 in the project:
✓ src/auth.py (modified)
✓ tests/test_auth.py (new file)

SonarQube analyzes: Only these 2 files
```

### Main Branch Analysis (Full Scan)
- **Scans the entire codebase** - analyzes all files in your project
- **Updates overall metrics** - coverage, bugs, code smells, security issues
- **Creates the baseline** - future PR scans compare against this
- **Tracks trends** - shows project health over time

**What gets analyzed:**
```
All 100 files in your project:
✓ src/auth.py
✓ src/database.py
✓ src/models.py
✓ tests/test_auth.py
✓ ... every file in the project
```

### The Workflow

```
1. Create PR → PR Analysis (diff only) → Shows only new issues
                     ↓
2. Merge to main → Main Analysis (full scan) → Updates baseline & metrics
```

This two-stage approach ensures:
- PRs get fast feedback on new code quality
- Main branch maintains accurate overall project health metrics

### SonarQube Community Edition Limitations

**Important:** SonarQube Community Edition has significant limitations compared to Developer/Enterprise editions:

#### What Community Edition CANNOT Do:
- ❌ **No branch analysis** - Cannot analyze multiple branches separately with `-Dsonar.branch.name`
- ❌ **No Pull Request decoration** - Cannot analyze PRs with `-Dsonar.pullrequest.*` parameters
- ❌ **No branch comparison** - Cannot compare one branch against another
- ❌ **No multiple branches in one project** - Each scan overwrites the previous analysis

#### What Community Edition CAN Do:
- ✅ **Full codebase analysis** - Scans the entire project
- ✅ **Quality metrics** - Coverage, bugs, code smells, security hotspots
- ✅ **Historical trends** - Track changes over time in the Activity tab
- ✅ **Quality Gates** - Set thresholds and check compliance
- ✅ **New Code Period** - Define what counts as "new code" (by version, days, or reference)

#### Workarounds for Community Edition:

**To analyze different branches:**
1. **Option A:** Scan different branches as separate projects:
   ```bash
   # Main branch
   podman run --rm -v $(pwd):$(pwd):z -w $(pwd) --network host \
     sonarsource/sonar-scanner-cli \
     -Dsonar.projectKey=myproject-main \
     -Dsonar.projectName="My Project - Main" \
     -Dsonar.token=$TOKEN

   # Feature branch
   git checkout feature-branch
   podman run --rm -v $(pwd):$(pwd):z -w $(pwd) --network host \
     sonarsource/sonar-scanner-cli \
     -Dsonar.projectKey=myproject-feature \
     -Dsonar.projectName="My Project - Feature Branch" \
     -Dsonar.token=$TOKEN
   ```

2. **Option B:** Use the "Previous Version" new code period to see changes between scans:
   - In SonarQube UI: Project Settings > New Code > "Previous version"
   - Each scan becomes a version, showing what changed since last scan

#### Running Full Branch Scan Locally

To run a complete scan of your branch:

```bash
# 1. Make sure you're on the branch you want to scan
git checkout your-branch-name

# 2. Generate coverage for the entire codebase
uv run pytest tests/ --cov=src --cov-report=xml:coverage.xml --cov-report=html

# 3. Run the full scan (analyzes all files in the project)
podman run --rm \
  -v $(pwd):$(pwd):z \
  -w $(pwd) \
  --network host \
  sonarsource/sonar-scanner-cli \
  -Dsonar.token=$TOKEN
```

This will:
- Analyze **all source files** in your project (not just changed files)
- Include **test coverage** data from coverage.xml
- Update all **code quality metrics** (bugs, vulnerabilities, code smells)
- Show **cognitive complexity** for all functions
- Report overall project health

**View the results at:** http://localhost:9000

The results show the complete state of your branch with all quality metrics and coverage data.

## Quality Gate Setup

Quality Gates ensure code meets minimum quality standards. When configured, the scanner can fail locally if your code doesn't meet the threshold.

### Configure Quality Gate in SonarQube

1. In SonarQube UI at http://localhost:9000, go to **Quality Gates**
2. Click "Create" or edit the default "Sonar way"
3. Add conditions for **Overall Code**:
   - Overall Coverage: `< 70%` (Error)
   - Overall Maintainability Rating: `worse than A` (Error)
   - Overall Security Hotspots Reviewed: `< 80%` (Error)
   - Duplicated Lines: `> 3%` (Error)

### Check Quality Gate Status Locally

Run the scanner with quality gate check:

```bash
export TOKEN=your_sonarqube_token

podman run --rm \
  -v $(pwd):$(pwd):z \
  -w $(pwd) \
  --network host \
  sonarsource/sonar-scanner-cli \
  -Dsonar.token=$TOKEN \
  -Dsonar.qualitygate.wait=true
```

The scanner will:
- Upload analysis results
- Wait for Quality Gate evaluation
- **Exit with error code 1** if Quality Gate fails (e.g., coverage < 70%)
- Exit with code 0 if Quality Gate passes

This allows you to verify code quality locally before committing changes.

## Production Deployment Tips

### Use Persistent Storage

For production, persist SonarQube data:

```bash
podman run -d \
  --name sonarqube \
  -p 9000:9000 \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_logs:/opt/sonarqube/logs \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  sonarqube:latest
```

### Use Environment Variables

Store sensitive data securely using environment variables instead of hardcoding:

```bash
# Export configuration as environment variables
export SONAR_PROJECT_KEY="my-project"
export SONAR_HOST_URL="http://localhost:9000"
export SONAR_TOKEN="your_token_here"

# Use in scanner
podman run --rm \
  -v $(pwd):$(pwd):z \
  -w $(pwd) \
  --network host \
  -e SONAR_TOKEN \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
  -Dsonar.host.url=${SONAR_HOST_URL}
```

---

[![HitCount](https://hits.dwyl.com/yarboa/yarboagithubio/sonarqube-setup-guide.svg?style=flat&show=unique)](http://hits.dwyl.com/yarboa/yarboagithubio/sonarqube-setup-guide)
