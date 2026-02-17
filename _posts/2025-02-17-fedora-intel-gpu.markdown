---
layout: post
title:  "Intel Arc GPU with Fedora"
date:   2025-02-17 12:11:08 +0200
categories: fedora
---

## Why This Matters

As an enthusiast of the ramalama project, I needed to use a GPU to run models
locally. Ramalama leverages GPU acceleration for better response times while
processing answers.

Most of my teammates are using Apple MacBooks or Mac mini systems with M2 or
newer chips. However, macOS is not Linux.

Recently I refreshed my Lenovo laptop, which contains a Meteor Lake (14th Gen)
GPU. My Fedora system uses the Wayland protocol; I am not using X11 anymore.

However, my GNOME graphical sessions started to freeze, and the only way to
recover was by rebooting.

This blog post explains how to fix screen freezes on Fedora systems running
the Wayland graphical compositor.

## Intel Arc GPU: Migrating from i915 to xe Driver with Fedora

I started a chat with Google Gemini and found that Intel released the xe driver.

## Comparison of the i915 and xe Drivers

<!-- markdownlint-disable MD036 -->
**Hardware Support**

| Feature             | i915 Driver    | xe Driver   |
|---------------------|----------------|-------------|
| Meteor Lake Support | Legacy/Limited | Native/Full |
| Arc GPU Support     | Not Supported  | Full Support|
| Integrated GPUs     | Up to 12th Gen | 12th Gen+   |

**Performance & Efficiency**

| Feature              | i915 Driver | xe Driver           |
|----------------------|-------------|---------------------|
| Graphics Performance | Good        | Better              |
| Compute Performance  | Good        | Optimized for AI/ML |
| Power Efficiency     | Good        | Improved            |

**Compute & AI**

| Feature            | i915 Driver | xe Driver                     |
|--------------------|-------------|-------------------------------|
| Level Zero Support | Yes         | Optimized                     |
| OpenCL Support     | Yes         | Yes                           |
| AI/ML Workloads    | Good        | Better (LLMs, AI inferencing) |
| oneAPI Integration | Supported   | Enhanced                      |

**Development Status**

| Feature            | i915 Driver      | xe Driver                 |
|--------------------|------------------|---------------------------|
| Active Development | Maintenance mode | Active development        |
| Kernel Status      | Stable (upstream)| Mainline since 6.8        |
| Feature Updates    | Bug fixes only   | Regular feature additions |

<!-- markdownlint-enable MD036 -->

**For LLM workloads with Podman:** xe driver provides better compute
performance and power management.

---

## Prerequisites

1. Check Your Kernel Version

   ```bash
   uname -r
   ```

   **Required:** Kernel 6.8+ (you have 6.18.8 ✅)

2. Verify xe Driver Availability

   ```bash
   modinfo xe
   ```

   Should show: `description: Intel Xe2 Graphics` ✅

3. Check Current Driver

   ```bash
   readlink /sys/class/drm/card*/device/driver
   ```

   Should show: `i915` (current state)

4. Backup Current Configuration (GRUB will be modified)

   ```bash
   sudo cp /etc/default/grub /etc/default/grub.backup.$(date +%Y%m%d)
   ```

5. Install Intel oneAPI (Optional but recommended for GPU compute workloads)

   Add Intel's oneAPI repository:

   <!-- markdownlint-disable MD013 -->
   ```bash
   sudo tee /etc/yum.repos.d/oneAPI.repo << EOF
   [oneAPI]
   name=Intel® oneAPI repository
   baseurl=https://yum.repos.intel.com/oneapi
   enabled=1
   gpgcheck=1
   repo_gpgcheck=1
   gpgkey=https://yum.repos.intel.com/intel-gpg-keys/GPG-PUB-KEY-INTEL-SW-PRODUCTS.PUB
   EOF
   ```
   <!-- markdownlint-enable MD013 -->

   Update and install the base kit:

   ```bash
   sudo dnf install intel-basekit
   ```

   **Warning:** This is several GBs in size.

---

## Migration Steps

1. Remove Conflicting i915 Configuration

   Your current GRUB configuration has an incorrect blacklist. Edit GRUB:

   ```bash
   sudo nano /etc/default/grub
   ```

   Find this line:

   <!-- markdownlint-disable MD013 -->
   ```text
   GRUB_CMDLINE_LINUX="rd.luks.uuid=luks-0bcd3d51-a5eb-4770-b826-5d4db4d8823d rhgb quiet intel_idle.max_cstate=4 module_blacklist=i915 i915.force_probe=!7d55 i915.enable_psr=0 i915.enable_fbc=0"
   ```

   Replace with:

   ```text
   GRUB_CMDLINE_LINUX="rd.luks.uuid=luks-0bcd3d51-a5eb-4770-b826-5d4db4d8823d rhgb quiet intel_idle.max_cstate=4 i915.force_probe=!* xe.force_probe=7d55"
   ```
   <!-- markdownlint-enable MD013 -->

   **Explanation:**

   - `i915.force_probe=!*` - Tells i915 to skip all devices
   - `xe.force_probe=7d55` - Tells xe to claim device 7d55 (your GPU)

2. Create Module Blacklist (Alternative Method)

   Create a blacklist file to ensure i915 doesn't load:

   ```bash
   sudo tee /etc/modprobe.d/blacklist-i915.conf <<EOF
   # Blacklist i915 in favor of xe driver
   blacklist i915
   EOF
   ```

3. Ensure xe Module Loads

   ```bash
   sudo tee /etc/modules-load.d/xe.conf <<EOF
   # Load xe driver at boot
   xe
   EOF
   ```

4. Update GRUB Configuration

   ```bash
   # For UEFI systems (most modern systems)
   sudo grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg

   # If that fails, try BIOS method:
   # sudo grub2-mkconfig -o /boot/grub2/grub.cfg
   ```

5. Rebuild initramfs

   ```bash
   sudo dracut --force
   ```

   This ensures the correct driver is loaded during early boot.

6. Reboot

   ```bash
   sudo reboot
   ```

---

## Verification

After reboot, verify the xe driver is active:

1. Check Active Driver

   ```bash
   readlink /sys/class/drm/card*/device/driver
   ```

   **Expected:** `../../../bus/pci/drivers/xe`

2. Verify xe Module is Loaded

   ```bash
   lsmod | grep -E "^xe"
   ```

   **Expected:** Shows xe module with usage count > 0

3. Verify i915 is NOT Loaded

   ```bash
   lsmod | grep -E "^i915"
   ```

   **Expected:** No output

4. Check dmesg for xe Driver

   ```bash
   dmesg | grep -i "xe.*7d55"
   ```

   **Expected:** Should show xe claiming your GPU

5. Check OpenCL/Level Zero Detection

   ```bash
   source /opt/intel/oneapi/setvars.sh --force
   sycl-ls
   ```

   **Expected:** Shows Intel Arc Graphics via Level Zero

6. Verify DRI Devices

   ```bash
   ls -la /dev/dri/
   ```

   **Expected:** `renderD128` and `card*` devices present

7. Verify Wayland Compatibility (Optional)

   ```bash
   # Check display server
   echo $XDG_SESSION_TYPE

   # Verify DRM/KMS is working
   cat /sys/class/drm/card*/status
   ```

   **Expected:** Wayland session with connected displays showing "connected"

---

[![HitCount](https://hits.dwyl.com/yarboa/yarboagithubio/fedora-intel-gpu.svg?style=flat&show=unique)](http://hits.dwyl.com/yarboa/yarboagithubio/fedora-intel-gpu)
