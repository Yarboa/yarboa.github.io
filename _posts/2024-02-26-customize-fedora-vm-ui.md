---

layout: post
title:  "customize-fedora-vm"
categories: virtualization, ui
---


This post share some simple commands for converting cloud fedora image to graphical.target.

During day to day work there is a need to reproduce test scenarios/ bugs inside
different environments at your dev working station or test labs, this blog deals more with graphical test environments..

### Prepare cloud Fedora-39 image for the work

- Download Fedora39 cloud image for [Fedora39](https://dl.fedoraproject.org/pub/fedora/linux/releases/39/Cloud/x86_64/images/Fedora-Cloud-Base-39-1.5.x86_64.qcow2)

``` bash
curl -C - --output-dir "/tmp"  -O https://dl.fedoraproject.org/pub/fedora/linux/releases/39/Cloud/x86_64/images/Fedora-Cloud-Base-39-1.5.x86_64.qcow2```
```

*Note:* Please refer the previous blog related to [previos_post](https://yarboa.github.io/virtualization/2023/10/29/customize-c9s-vm.html) for customizing vms  

To avoid full disk space error while customizing vm, please use qemu-img resize from previos post, lets check our target once sshd to vm

``` bash
systemctl get-default
multi-user.target
```

### Running Fedora machine 

``` bash
/usr/bin/qemu-system-x86_64 -smp 12 -enable-kvm -m 2G -machine q35 -cpu host -vnc 0.0.0.0:3 -k en-us -device virtio-net-pci,netdev=n0,mac=FE:30:26:a6:91:2d -netdev user,id=n0,net=10.0.2.0/24,hostfwd=tcp::2224-:22 -drive file=./Fedora-Cloud-Base-39-orig-1.5.x86_64.qcow2,index=0,media=disk,format=qcow2,if=virtio,snapshot=off&
```

Ssh into running vm, 

``` bash

ssh -oStrictHostKeyChecking=no -oUserKnownHostsFile=/dev/null  root@localhost -p 2224

```

Complere block configuration for larger disk size

``` bash

[root@localhost ~]# lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sr0     11:0    1 1024M  0 rom  
zram0  251:0    0  1.9G  0 disk [SWAP]
vda    252:0    0   20G  0 disk 
├─vda1 252:1    0    1M  0 part 
├─vda2 252:2    0 1000M  0 part /boot
├─vda3 252:3    0  100M  0 part /boot/efi
├─vda4 252:4    0    4M  0 part 
└─vda5 252:5    0  3.9G  0 part /home
                                /

[root@localhost ~]# growpart /dev/vda 5
[root@localhost ~]# btrfs filesystem resize +10g /

[root@localhost ~]# lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sr0     11:0    1 1024M  0 rom  
zram0  251:0    0  1.9G  0 disk [SWAP]
vda    252:0    0   20G  0 disk 
├─vda1 252:1    0    1M  0 part 
├─vda2 252:2    0 1000M  0 part /boot
├─vda3 252:3    0  100M  0 part /boot/efi
├─vda4 252:4    0    4M  0 part 
└─vda5 252:5    0 18.9G  0 part /home
                                /
```



### Convert cloud Fedora-39 image to graphical.target with Wayland compositor

My goal is to run Wayland compositor instead of X11 server, we also need to install Windows Manager that use this compositor, i found this article very usefull [Switch display managers with Fedora][1] and [Adding GUI to fedora][2]  

```bash

[root@localhost ~]#  dnf group list --installed
Last metadata expiration check: 0:03:30 ago on Wed 28 Feb 2024 11:40:16 AM UTC.
Installed Environment Groups:
   Fedora Cloud Server
```


Choose GUI to install, pretty hevay more then 1.3G and 1400 rpms to install

```bash

[root@localhost ~]# dnf group list
[root@localhost ~]# dnf group install "KDE Plasma Workspaces"
[root@localhost ~]# systemctl set-default graphical.target
[root@localhost ~]# dnf install gdm
[root@localhost ~]# systemctl enable gdm.service
[root@localhost ~]# systemctl reboot

```

Ssh into running vm, 

``` bash

ssh -oStrictHostKeyChecking=no -oUserKnownHostsFile=/dev/null  root@localhost -p 2224

```

Connect with vnc-client to 0.0.0.0:3 server 
Use the GUI login console for root

Now lets check what type of window server we have Wayland or X11

``` bash
[root@localhost ~]# systemctl get-default
graphical.target  
[root@localhost ~]# echo $XDG_SESSION_TYPE
tty

```


Lets open Terminal from graphical console 

``` bash
[root@localhost ~]# echo $XDG_SESSION_TYPE
wayland
```

In case you choose different Desktop to install and the following is set
``` bash
[root@localhost ~]# echo $XDG_SESSION_TYPE
x11
```

Need to update the xserver to be replaces with wayland

``` bash

sed 's/#WaylandEnable=false/WaylandEnable=true/' /etc/gdm/custom.conf

```

Reboot and check 


[1]: https://www.if-not-true-then-false.com/2018/fedora-switch-display-manager/
[2]: https://docs.fedoraproject.org/en-US/fedora-server/usecase-gui-addon/


[![HitCount](https://hits.dwyl.com/yarboa/yarboagithubio/customize-fedora-vm-ui.svg?style=flat&show=unique)](http://hits.dwyl.com/yarboa/yarboagithubio/customize-fedora-vm-ui)
