---

layout: post
title:  "customize-c9s-vm"
date:   2023-10-29 12:11:08 +0300
categories: virtualization
---


This post share some simple commands for virtualmachines.  
During day to day work there is a need to reproduce test scenarios/ bugs inside 
different environments at your dev working station or test labs.

With many cases, containers could be sufficient, but for other use cases interacts with containers as pods or docker compose, is not enough,  

Automated tests with specific Operating Systems  can be run locally or against  AWS image or any other testing framwerk.


That post uses few commands that could be automated inside bash scripts or ansible playbooks
later on.


_**Prepare cloud centos-stream-9 image for your work**_

- Download CentOSStream9 cloud image for [CentOSStream9](https://cloud.centos.org/centos/9-stream/x86_64/images/CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2)

``` bash
curl --output-dir "/tmp" -O https://cloud.centos.org/centos/9-stream/x86_64/images/CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2
```

- Increase disk size in +10G

``` bash
qemu-img resize /tmp/CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2 +20G
```

- Set root password, remove cloud-init option and enable root login 

``` bash
virt-customize --uninstall cloud-init --root-password password:${PASSWORD} \
--edit '/etc/ssh/sshd_config: \
s/#PermitRootLogin.*/PermitRootLogin yes/' -a /tmp/CentOS-Stream-GenericCloud-9-latest.aarch64.qcow2  
```


- Run virtual machine with port forwarding:

``` bash
/usr/bin/qemu-system-x86_64 -smp 12 -enable-kvm -m 2G -machine q35 -cpu host -vnc 0.0.0.0:1 -k en-us -device virtio-net-pci,netdev=n0,mac=FE:30:26:a6:91:2d -netdev user,id=n0,net=10.0.2.0/24,hostfwd=tcp::2222-:22 -drive file=CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2,index=0,media=disk,format=qcow2,if=virtio,snapshot=off&

```

- Ssh to running machine with new ${PASSWORD}:

``` bash
ssh -oStrictHostKeyChecking=no -oUserKnownHostsFile=/dev/null  root@localhost -p 2222
```

- Check your blockdevices:

```bash
lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sr0     11:0    1 1024M  0 rom  
vda    252:0    0   25G  0 disk 
└─vda1 252:1    0  7.8G  0 part /
```

Incase of xfs file type, use command blkid, use grows command

```bash
# Grow / to use the whole partition 
xfs_growfs /  
# Grow / to use the 50% partition 
growpart --free-percent=50 /dev/vda 1

```

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fyarboa.github.io%2Fvirtualization%2F2023%2F10%2F29%2Fcustomize-c9s-vm.html&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)

