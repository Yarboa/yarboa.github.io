---
layout: post
title:  "Building S32G3 Linux Auto with RPM Packages using Podman"
categories: yocto
---

## Introduction

Recently, I've been working on creating Fedora RPMs for NSX components, which led me to explore how to integrate custom userspace components into embedded Linux distributions. This guide demonstrates how the NXP Yocto build system can seamlessly create RPM packages as part of its image build process. I'm sharing how to set up S32G3 Linux auto with Fedora-branch Linux repos and modern packaging practices using Podman, while extending it with custom userspace components.

This guide provides step-by-step instructions for building the NXP S32G3 Linux BSP with RPM package support using Podman containerization, including how to extend it with non-standard userspace components.

## Prerequisites

- Podman installed on your host system
- ~100GB free disk space for the build
- NXP S32G3 BSP sources and firmware binaries
- HSE firmware (only if building with HSE support)

### Obtaining NXP Software and Documentation

To download updates, access firmware, and read documentation, you'll need an NXP account:

1. **Create NXP Account**
   - Visit: <https://www.nxp.com>
   - Create a free account

2. **Request Software Download Access**
   - Go to: <https://www.nxp.com/webapp/swlicensing/sso/downloadSoftware.sp?catid=SW32G-STDSW-D>
   - Request access for S32G software downloads
   - Available downloads include:
     - S32G Linux BSP and firmware
     - HSE (Hardware Security Engine) firmware
     - Documentation and reference manuals
     - SDK tools and utilities

3. **Join NXP Community**
   - S32G Community Forum: <https://community.nxp.com/t5/S32G/bd-p/S32G>
   - Get support and ask questions
   - Access community-contributed resources
   - Stay updated on latest releases and patches

## Directory Structure Setup

Create the working directory structure on your host machine:

```bash
mkdir -p ~/tests/s32g3workspace/{sources,hse_binaries,build-output}
cd ~/tests/s32g3workspace
```

## Step 1: Install repo Tool on Host

Download and configure the `repo` tool (Google's multi-repository management tool):

```bash
mkdir -p ~/bin
curl https://storage.googleapis.com/git-repo-downloads/repo > ~/bin/repo
chmod a+x ~/bin/repo
export PATH=~/bin:$PATH
```

## Step 2: Initialize and Sync BSP Sources

Initialize the NXP Auto Linux Yocto BSP repository:

```bash
cd ~/tests/s32g3workspace/sources
repo init -u https://github.com/nxp-auto-linux/auto_yocto_bsp.git -b release/bsp<BRANCH_VER>
repo sync
```

This will download all necessary Yocto layers and BSP components (typically 30-50GB).

## Step 3: Downloading DDR Firmware Binaries

For detailed instructions on obtaining the DDR firmware files (ddr_fw_ecc_off.bin and ddr_fw_ecc_on.bin), licensing requirements, and proper download procedures, refer to the NXP community discussion:
<https://community.nxp.com/t5/S32G/I-don-t-know-where-the-DDR-FW-is-during-the-linux-BSP-44-0-yocto/m-p/2141767>

Copy the required DDR firmware binaries from your NXP S32G3 userspace package:

```bash
# From host directory
cp ~/tests/NXP-S32G3-userspace/s32g3_linuxbsp_<BRANCH_VER>_binaries/s32g399aevb3/ddr_fw_ecc_off.bin \
   ~/tests/s32g3workspace/sources/meta-alb/meta-alb-bsp/recipes-bsp/ddr-firmware/files/

cp ~/tests/NXP-S32G3-userspace/s32g3_linuxbsp_<BRANCH_VER>_binaries/s32g399aevb3/ddr_fw_ecc_on.bin \
   ~/tests/s32g3workspace/sources/meta-alb/meta-alb-bsp/recipes-bsp/ddr-firmware/files/
```

## Step 4: Launch Podman Container

Start the Yocto build environment container with proper volume mappings:

```bash
podman run --replace \
  -v ~/tests/s32g3workspace:/workdir:Z \
  --workdir /workdir \
  --userns=keep-id:uid=1000,gid=1000 \
  --pids-limit=-1 \
  -d -it \
  --name yocto-test \
  crops/poky:ubuntu-22.04 bash
```

**Flag explanations:**

- `--replace`: Remove any existing container with the same name
- `-v ~/tests/s32g3workspace:/workdir:Z`: Mount host directory with SELinux context
- `--userns=keep-id`: Preserve host user ID to avoid permission issues
- `--pids-limit=-1`: Unlimited process limit for bitbake parallelism
- `crops/poky:ubuntu-22.04`: Official Yocto build container

## Step 5: Initialize Yocto Build Environment (Inside Container)

Once inside the container:

```bash
cd /workdir/sources
source nxp-setup-alb.sh -m s32g399aevb3
```

This script sets up the build directory structure and initializes the Yocto environment for the S32G399AEVB3 board.

---

## Build Configuration Options

### Default Build (No Extra Features)

#### Configure local.conf for Default Build

Edit the Yocto configuration file:

```bash
nano /workdir/sources/build_s32g399aevb3/conf/local.conf
```

Add or ensure only this section is present:

```bash
# Enable RPM package format instead of DEB
PACKAGE_CLASSES = "package_rpm"
```

#### Build the Default Image

Execute the Yocto build:

```bash
cd /workdir/sources/build_s32g399aevb3
bitbake fsl-image-auto
```

**Build time:** 60-120 minutes depending on system performance.

#### Default Build Output Locations

After successful completion, artifacts are located in:

##### Root Filesystem and Images

```bash
tree /workdir/sources/build_s32g399aevb3/tmp/deploy/images/s32g399aevb3/
├── fsl-image-auto-s32g399aevb3.rootfs.tar.bz2      # Compressed rootfs tarball
├── fsl-image-auto-s32g399aevb3.rootfs.rpm          # RPM-based rootfs
├── fsl-image-auto-s32g399aevb3.sdcard.bz2          # SD card image
├── fsl-image-auto-s32g399aevb3.wic.bz2             # WIC disk image
├── u-boot-s32g399aevb3.bin                         # U-Boot bootloader
├── Image                                            # Linux kernel
├── s32g399aevb3.dtb                                # Device tree blob
└── [additional image formats]
```

##### RPM Packages (all built packages)

```bash
tree /workdir/sources/build_s32g399aevb3/tmp/deploy/rpm/
├── s32g399aevb3/                  # Board-specific packages
│   ├── ddr-firmware-*.rpm
│   ├── linux-libc-dev-*.rpm
│   └── [other architecture-specific packages]
├── armv8a/                        # ARMv8 packages
├── aarch64/                       # 64-bit ARM packages
├── all/                           # Architecture-independent packages
└── noarch/
```

##### Build Logs

```bash
/workdir/sources/build_s32g399aevb3/tmp/log/
├── cooker/<timestamp>/
│   ├── console-latest.log         # Main build log
│   ├── runqueue-<timestamp>.log
│   └── [task-specific logs]
```

##### Copy Default Build Artifacts to Host

```bash
# From inside container or via host
cp -r /workdir/sources/build_s32g399aevb3/tmp/deploy/images/s32g399aevb3/ \
      /workdir/build-output/default-build/

cp -r /workdir/sources/build_s32g399aevb3/tmp/deploy/rpm/ \
      /workdir/build-output/default-build/rpm-packages/
```

---

## Building Non-Standard Userspace Components

This section demonstrates how to extend the base build with custom userspace components. I used the HSE (Hardware Security Engine) component as a practical example of this approach, showing how to integrate optional NXP features while the same methodology applies to any custom daemon, tool, or application component you want to package into your image.

### HSE Build Example

#### Prerequisites for HSE Build

1. **Obtain HSE Firmware**: Download the HSE firmware package from NXP
   - Example: `HSE_FW_S32G3XX_0_2_64_0`
   - Extract to a host directory accessible from the container

2. **Prepare HSE Firmware Directory**

   ```bash
   # On host, prepare the firmware structure
   mkdir -p ~/tests/s32g3workspace/HSE_FW_S32G3XX_0_2_64_0
   # Copy HSE firmware files into this directory
   cp /path/to/hse/firmware/* ~/tests/s32g3workspace/HSE_FW_S32G3XX_0_2_64_0/
   ```

#### Configure local.conf for HSE Build

Edit the Yocto configuration file:

```bash
nano /workdir/sources/build_s32g399aevb3/conf/local.conf
```

Add the following sections:

```bash
# Enable RPM package format instead of DEB
PACKAGE_CLASSES = "package_rpm"

##### HSE Security Features (Example of Optional Feature)
# 1. Enable the secure boot DISTRO flag and append the HSE packages
DISTRO_FEATURES:append = " hse"
IMAGE_INSTALL:append = " pkcs11-hse"

# 2. Point to the mapped host folder containing HSE firmware binary
# The path is relative to the container's /workdir mount
NXP_FIRMWARE_LOCAL_DIR = "/workdir/HSE_FW_S32G3XX_0_2_64_0"
HSE_VERSION = "0_2_64_0"
```

**Configuration notes:**

- `NXP_FIRMWARE_LOCAL_DIR`: Must point to the directory containing HSE firmware binaries
- `HSE_VERSION`: Must match the firmware version string
- `DISTRO_FEATURES:append = " hse"`: Enables HSE-related recipes
- `IMAGE_INSTALL:append = " pkcs11-hse"`: Adds PKCS#11 HSE module to the image

#### Build with HSE

Execute the Yocto build with HSE support:

```bash
cd /workdir/sources/build_s32g399aevb3
bitbake fsl-image-auto
```

**Build time:** 90-150 minutes (additional time for HSE components).

#### HSE Build Output Locations

After successful completion, all artifacts are in the same base directories as default builds, but with additional HSE-specific packages and binaries.

##### Root Filesystem and Images (same structure as default)

```bash
tree /workdir/sources/build_s32g399aevb3/tmp/deploy/images/s32g399aevb3/
├── fsl-image-auto-s32g399aevb3.rootfs.rpm          # Includes HSE packages
├── fsl-image-auto-s32g399aevb3.sdcard.bz2          # SD card with HSE FW
└── [other formats with HSE]
```

##### HSE-Specific RPM Packages

```bash
tree /workdir/sources/build_s32g399aevb3/tmp/deploy/rpm/
├── aarch64/
│   ├── hse-firmware-0-2-64-0-*.rpm                # HSE firmware package
│   ├── hse-linux-driver-*.rpm                     # HSE Linux driver
│   ├── pkcs11-hse-*.rpm                           # PKCS#11 module for HSE
│   ├── libhse-*.rpm                               # HSE libraries
│   └── hse-tools-*.rpm                            # HSE utilities
├── noarch/
│   └── [HSE architecture-independent packages]
└── [other packages]
```

##### HSE Build Logs and Artifacts

```bash
tree /workdir/sources/build_s32g399aevb3/tmp/
├── deploy/
│   ├── hse-firmware/                   # HSE firmware staging
│   ├── images/s32g399aevb3/
│   │   ├── hse_firmware_*.bin          # Binary HSE firmware
│   │   └── [other files]
│   └── rpm/
│       └── [HSE RPM packages as above]
├── work/
│   ├── aarch64-*/hse-*                 # HSE recipe build directories
│   └── s32g399aevb3-*/                 # Board-specific builds with HSE
└── log/
    └── [build logs including HSE compilation]
```

##### Copy HSE Build Artifacts to Host

```bash
# From inside container or via host
cp -r /workdir/sources/build_s32g399aevb3/tmp/deploy/images/s32g399aevb3/ \
      /workdir/build-output/hse-build/

cp -r /workdir/sources/build_s32g399aevb3/tmp/deploy/rpm/ \
      /workdir/build-output/hse-build/rpm-packages/
```

---

## Comparing Default vs HSE Builds

### File Size Differences

| Artifact | Default | HSE Build | Difference |
| -------- | ------- | --------- | ---------- |
| fsl-image-auto-*.rootfs.rpm | ~500 MB | ~520 MB | +20 MB (HSE FW) |
| fsl-image-auto-*.sdcard.bz2 | ~150 MB | ~160 MB | +10 MB (HSE FW) |
| Total RPM packages | ~2.5 GB | ~2.7 GB | +200 MB (HSE libs) |

### Key Differences in Output

**Default Build:**

- Basic Linux kernel and bootloaders
- Standard ARM64 utilities
- DDR firmware (ecc_on/ecc_off variants)
- No security engine support

**HSE Build (Extra RPMs example):**

- All default components
- HSE firmware binary
- PKCS#11 HSE module for cryptographic operations
- HSE Linux driver and userspace tools
- Additional security libraries

---

## Generated Build Artifacts Location

This section shows where all generated work products are located after a successful build.

### Quick Reference - Generated Artifacts

**Navigate to the build directory:**

```bash
cd /workdir/sources/build_s32g399aevb3
```

### 1. Generated Images (Installation-Ready)

**Location:** `./tmp/deploy/images/s32g399aevb3/`

**List images with timestamps:**

```bash
ls -ltr ./tmp/deploy/images/s32g399aevb3/
```

**Key bootable images:**

- `fsl-image-auto-s32g399aevb3.sdcard.bz2` - SD card image (ready to flash)
- `fsl-image-auto-s32g399aevb3.wic.bz2` - WIC disk image format
- `fsl-image-auto-s32g399aevb3.rootfs.rpm` - RPM-based rootfs
- `u-boot-s32g399aevb3.bin` - U-Boot bootloader binary
- `Image` - Linux kernel image
- `s32g399aevb3.dtb` - Device tree blob

**Copy images to host output directory:**

```bash
cp -r ./tmp/deploy/images/s32g399aevb3/* /workdir/build-output/images/
```

---

### 2. Generated RPM Packages (Installation-Ready)

**Location:** `./tmp/deploy/rpm/`

**List RPM packages by architecture:**

```bash
# List packages for specific architecture
ls -ltr ./tmp/deploy/rpm/cortexa53_crypto/

# List all architectures with packages
ls -ltr ./tmp/deploy/rpm/
```

**Architecture directories in deploy:**

```bash
tree ./tmp/deploy/rpm/
├── cortexa53_crypto/              # CortexA53 with crypto support
│   ├── pkcs11-hse-*.rpm           # PKCS#11 HSE module
│   ├── hse-firmware-*.rpm         # HSE firmware
│   ├── hse-linux-driver-*.rpm     # HSE Linux driver
│   └── [other packages]
├── all/                           # Architecture-independent packages
├── noarch/                        # No-architecture packages
└── Packages                       # RPM metadata index
```

**Find specific packages:**

```bash
# Find all HSE-related RPMs
find ./tmp/deploy/rpm -name "*hse*.rpm"

# Find kernel modules
find ./tmp/deploy/rpm -name "*modules*.rpm"

# Count total RPM packages
find ./tmp/deploy/rpm -name "*.rpm" | wc -l

# List all RPMs with sizes
find ./tmp/deploy/rpm -name "*.rpm" -exec ls -lh {} \; | awk '{print $9, $5}' | sort
```

**Copy RPM packages to host output directory:**

```bash
# Copy all RPMs
cp -r ./tmp/deploy/rpm/* /workdir/build-output/rpms/

# Copy specific architecture
cp -r ./tmp/deploy/rpm/cortexa53_crypto/* /workdir/build-output/rpms-crypto/
```

---

### 3. RPM Spec Files (Build Specifications)

**Location:** `./tmp/work/cortexa53-crypto-fsl-linux/`

**List package build directories:**

```bash
ls -ltr ./tmp/work/cortexa53-crypto-fsl-linux/
```

**Directory structure for each package:**

```bash
tree ./tmp/work/cortexa53-crypto-fsl-linux/
├── pkcs11-hse/
│   └── 1.0/
│       ├── pkcs11-hse.spec                # ✅ RPM SPEC FILE
│       ├── build/                         # Build output files
│       ├── image/                         # Staged installation files
│       ├── packages-split/                # Split package files
│       ├── log.do_configure
│       ├── log.do_compile
│       ├── log.do_install
│       └── temp/                          # Build scripts and logs
├── hse-firmware/
│   └── 0.2.64.0/
│       ├── hse-firmware.spec              # ✅ RPM SPEC FILE
│       ├── [similar structure]
├── linux-kernel/
│   └── 6.1.46/
│       ├── kernel.spec                    # ✅ RPM SPEC FILE
│       ├── [similar structure]
└── [other packages]
```

**View spec files for packages:**

```bash
# List all spec files
find ./tmp/work/cortexa53-crypto-fsl-linux -name "*.spec"

# View a specific spec file
cat ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/pkcs11-hse.spec

# View HSE firmware spec
cat ./tmp/work/cortexa53-crypto-fsl-linux/hse-firmware/*/hse-firmware.spec

# Search spec content
grep -r "Summary" ./tmp/work/cortexa53-crypto-fsl-linux --include="*.spec"
```

**Spec file example:**

```bash
ls ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/pkcs11-hse.spec
./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/pkcs11-hse.spec
```

[Contains RPM package definition including]:

- Summary and description
- Version, release, and package information
- Build dependencies
- Compilation flags
- Installation instructions
- File lists (%files section)
- Changelog

**Find build logs for each package:**

```bash
# List build logs for specific package
ls -ltr ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/log.*

# View compilation log
cat ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/log.do_compile

# View installation log
cat ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/log.do_install

# View build script
cat ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/temp/run.do_compile.*
```

---

### 4. Complete Directory Structure Map

``` bash
./tmp/
├── deploy/                                    # Final installation artifacts
│   ├── images/s32g399aevb3/                  # ✅ BOOTABLE IMAGES
│   │   ├── fsl-image-auto-*.sdcard.bz2
│   │   ├── u-boot-s32g399aevb3.bin
│   │   ├── Image                             # Linux kernel
│   │   └── s32g399aevb3.dtb                  # Device tree
│   │
│   └── rpm/                                   # ✅ RPM PACKAGES BY ARCH
│       ├── cortexa53_crypto/                 # Main architecture
│       ├── all/                              # Arch-independent
│       └── noarch/                           # No-arch packages
│
├── work/                                      # Build work directories
│   ├── cortexa53-crypto-fsl-linux/          # Main architecture work
│   │   ├── pkcs11-hse/
│   │   │   └── 1.0/
│   │   │       ├── pkcs11-hse.spec          # ✅ SPEC FILE
│   │   │       ├── log.do_*                 # Build logs
│   │   │       ├── temp/run.do_*            # Build scripts
│   │   │       └── packages-split/          # Generated RPM contents
│   │   ├── hse-firmware/                    # HSE firmware build
│   │   └── [other packages]
│   │
│   └── [other architecture builds]
│
└── log/                                       # Build diagnostics
    └── cooker/<timestamp>/
        ├── console-latest.log               # Build output
        └── [task logs]
```

---

### Quick Navigation Commands

**Change to build directory:**

```bash
cd /workdir/sources/build_s32g399aevb3
```

**View all generated images:**

```bash
ls -ltr ./tmp/deploy/images/s32g399aevb3/
```

**View all generated RPM packages:**

```bash
ls -ltr ./tmp/deploy/rpm/cortexa53_crypto/
```

**View all RPM spec files:**

```bash
find ./tmp/work/cortexa53-crypto-fsl-linux -name "*.spec"
```

**View a specific package spec file:**

```bash
cat ./tmp/work/cortexa53-crypto-fsl-linux/pkcs11-hse/1.0/pkcs11-hse.spec
```

**Copy all generated artifacts to host:**

```bash
# Copy images
cp -r ./tmp/deploy/images/s32g399aevb3/* /workdir/build-output/images/

# Copy RPM packages
cp -r ./tmp/deploy/rpm/cortexa53_crypto/* /workdir/build-output/rpms/

# Copy spec files
cp -r ./tmp/work/cortexa53-crypto-fsl-linux /workdir/build-output/build-work/
```

---

## Cleaning the Build

To clean all build artifacts and start fresh:

```bash
cd /workdir/sources/build_s32g399aevb3
bitbake -c cleanall fsl-image-auto
```

To clean only specific components:

```bash
# Clean kernel only
bitbake -c clean linux-alb

# Clean U-Boot only
bitbake -c clean u-boot-alb

# Clean HSE packages
bitbake -c clean pkcs11-hse
bitbake -c clean hse-firmware
```

To clean build directory completely:

```bash
rm -rf /workdir/sources/build_s32g399aevb3/tmp/
```

---

## Managing the Container Session

### Executing Commands in a Running Container

To run commands in the running container without attaching the full terminal:

```bash
podman exec -it yocto-test bash
```

### Checking Container Status

To see if the container is running:

```bash
podman ps -a | grep yocto-test
```

Or get more detailed status:

```bash
podman inspect yocto-test --format='{{.State.Running}}'
```

### Stopping the Container

To stop the running container gracefully:

```bash
podman stop yocto-test
```

The `-t0` flag sets the timeout to 0 seconds, forcing an immediate stop. This is useful when the container is unresponsive or you need to stop it quickly.

### Restarting the Container

To restart a stopped container:

```bash
podman start yocto-test
```

Execute commands in it:

```bash
podman exec -it yocto-test bash
```

---

## Troubleshooting

### Container Permission Issues

If you encounter permission issues with the mounted volume:

- Ensure SELinux label `:Z` is present in the mount flag
- Verify host user UID/GID matches the container settings

### Build Space Issues

If the build fails due to disk space:

```bash
# Clean intermediate build files
bitbake -c cleanall fsl-image-auto
rm -rf /workdir/sources/build_s32g399aevb3/tmp/
```

### HSE Firmware Not Found

Verify the firmware path:

```bash
ls -la /workdir/HSE_FW_S32G3XX_0_2_64_0/
```

The directory should contain `hse_firmware_*.bin` files.

### Build Dependency Issues

Update and resync the sources:

```bash
cd /workdir/sources
repo sync
repo rebase
```

---

## Build Performance Optimization

To speed up builds, configure parallel compilation in `local.conf`:

```bash
# Set to number of CPU cores available
BB_NUMBER_THREADS = "8"
PARALLEL_MAKE = "-j 8"
```

---

## Additional Resources

- **NXP S32G3 User Manual**: ~/tests/NXP-S32G3-userspace/S32G3_LinuxBSP_<BRANCH_VER>_User_Manual.md
- **Yocto Project Documentation**: <https://www.yoctoproject.org/>
- **Crops Poky Container**: <https://github.com/crops/poky-container>

**Note:** Replace `<BRANCH_VER>` with your actual BSP branch version throughout this guide (e.g., 46.0, 47.0, etc.).
All NXP software packages, documentation, and firmware binaries must be downloaded from:
<https://www.nxp.com/webapp/swlicensing/sso/downloadSoftware.sp?catid=SW32G-STDSW-D>

---

[![HitCount](https://hits.dwyl.com/yarboa/yarboagithubio/yocto-nsp-build.svg?style=flat&show=unique)](http://hits.dwyl.com/yarboa/yarboagithubio/yocto-nsp-build)
