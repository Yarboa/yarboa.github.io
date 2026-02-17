---

layout: post
title:  "Run-podman-on-windows"
date:   2022-10-11 12:11:08 +0300
categories: podman update
---

In this blog I will explain how to run podman containers on windows.
Distributed teams should have common dev/testing environment to collaborate.
Once Pull Request/Merge Request pushed to git server repo, automated tests are running
on github/gitlab pipelines.
Once gating tests are passed other team members could start review the features/fixes
contributed by repo members.

What are the options of a contributer with Windows host,
Who wishes to contribute Linux distribution project?

Options:

1. Install virtualization solution, example vagrant with linux distro.
1. Install containers with equivalent image.

Recently I read this podman blog [run podman on windows][1],
 during tracking the outputs of msi installation, I realised that
 podman Windows installer uses Windows Substem for Linux, [WSL][2].

Later on podman docs refered to wsl2 [Windows podman install][3]

_**Setup windows environment for linux**_

Run PowerShell command with elevated permissions \[Win+x\]:

``` Command
winget install Microsoft.WindowsTerminal
```

Install wsl and set to version 2

``` PowerShell 
wsl --install
```

Installation ask to reboot
**The requested operation is successful.
 Change will not be effective untill the subsytem is rebooted.**

Change to wsl v2

``` PowerShell
wsl --set-default-version 2
```

Verify wsl is in version 2

``` PowerShell
wsl --status
```

Thanks to this blog, [install fedora on Windows][4]

Download fedora36 image from here
 <https://kojipkgs.fedoraproject.org/packages/Fedora-Container-Base/36/{build-date}/images>

select the relevant distribution such as x86_64

Download the web browser, could change with newer versions:

<https://kojipkgs.fedoraproject.org/packages/Fedora-Container-Base/36/{build-date}/images/Fedora-Container-Base-{build-date}.x86_64.tar.xz>

extract the tar file and search for layer.tar inside Fedora-Container-Base-{build-date}.x86_64.tar
Rename it to Fedoras-36-rootfs.tar

Now fedora image could be imported to wsl, please note to replace the vars in <>
With your computer vars

Create a Directory for wsl imported images and replace it with your name

``` PowerShell
mkdir {WslImageDir}
wsl --import fedora {WslImageDir} C:\Users\{WindowsUser}\{SavedDir}\Fedora-36-rootfs.tar
```

Verify didtro is imported with wsl -l

Now WSL is ready to run fedora distro

``` PowerShell
wsl -d fedora
```

WSL fedora VM is running and user logged in vm console as user root
To verify the distro, and user name

``` PowerShell
cat /etc/redhat-release
cd ~/
pwd
```

Now we can update fedora and install podman inside the vm

``` PowerShell
dnf update -y
dnf install podman -y

podman run ubi9-micro date
```

Image is downloaded and print the date

Environment is ready, it is time to run a container and check it
from the virtualmachine

``` PowerShell
podman run --rm -d -p 8080:80 --name httpd docker.io/library/httpd
curl http://localhost:8080/ -UseBasicParsing
```

Exit virtualmachine fedora
Try curl from windows command line,
From PowerShell/command.

``` PowerShell
exit
(curl http://localhost:8080/ -UseBasicParsing).Content
```

The following output should be expected.
\<html\>\<body\>\<h1\>It works!\</h1\>\</body\>\</html\>

[1]: https://www.redhat.com/sysadmin/run-podman-windows
[2]: https://learn.microsoft.com/en-us/windows/wsl/install
[3]: https://podman.io/getting-started/installation
[4]: https://dev.to/bowmanjd/install-fedora-on-windows-subsystem-for-linux-wsl-4b26

[![HitCount](https://hits.dwyl.com/yarboa/yarboagithubio/run-podman-on-win.svg?style=flat&show=unique)](http://hits.dwyl.com/yarboa/yarboagithubio/run-podman-on-win)
