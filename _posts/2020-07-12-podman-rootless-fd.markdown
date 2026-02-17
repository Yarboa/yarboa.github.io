---
layout: post
title:  "Run-rootless-podman-filedescriptors!"
date:   2020-07-12 15:11:08 +0300
categories: podman update
---

In this post i would like to discuss my experience with file descriptors
 issues in rootless podman.  
Tried to build from scratch openstack [nfv-tempest-plugin][1]  
This openstack nfv-tempest plugin requires:
* python3.6 and up.  
* pip tempest  
* pip  python-tempestconf  
* pip  neutron-tempest-plugin   

once the above installed we are ready to install nfv-tempest-plugin
through git or pip.

I will review in the following article the operation and checks for podman.
and how to work around file descriptors errors while building the image.

#### _**install Centos/Rhel 7.X packages**_

```bash
sudo -i
yum install podman -y
echo "user.max_user_namespaces=28633" > /etc/sysctl.d/userns.conf
sysctl -p /etc/sysctl.d/userns.conf
```

#### _**Run command  in user namespace**_

```bash
[stack@RHEL7 ~]$ podman unshare cat /proc/self/uid_map
         0       1001          1
         1     165536      65536

[stack@RHEL7 ~]$ podman unshare cat /proc/self/gid_map
         0       1001          1
         1     165536      65536
```


#### _**Consume dockerhub images**_

```bash
[stack@RHEL7 ~]$ podman login -u yarboa docker.io
Password: 
Login Succeeded!
skopeo inspect docker://rackspacedot/python37
podman pull rackspacedot/python37
```

Verify glibc is packed in the container

```bash
[stack@RHEL7 ~]$ podman inspect docker.io/rackspacedot/python37
```

#### _**Run and verify container is ready for running tempest**_

Run container 
```bash
[stack@RHEL7 ~]$ podman run -it docker.io/rackspacedot/python37 /bin/bash
root@e9762ca9a49c:/# 
root@e9762ca9a49c:/# ulimit -Hn
1024
root@e9762ca9a49c:/# ulimit -Sn
1024
```

Install required packages:
```bash
root@e9762ca9a49c:/# python -m pip install -U pip
root@e9762ca9a49c:/# python -m pip install -U tempest
OSError: [Errno 24] Too many open files: '/tmp/pip-ephem-wheel-cache-_8l0t8s7'
```
#### _**Increase user files descriptor**_

Googling a bit brings you to the follwoing [podman-ticket][2]
Searching a bit more brings you to the follwoing [article][3] 

Add rootless podman user number of files
```bash
sudo -i
vi /etc/security/limits.conf
# End of file
stack   soft   nofile    1048576
stack   hard   nofile    1048576
:wq

sysctl -p
```
Logout as rootles user and login

```bash
[stack@RHEL7 ~]$ ulimit -n
1048576
```
We are ready to run podman image with new ulimits
```bash
podman run --ulimit nofile=1048576:1048576 -it docker.io/rackspacedot/python37 /bin/bash

root@e9762ca9a419:/# ulimit -Hn
1048576
```

Try to install tempest
```bash
root@e9762ca9a419:/# python -m pip install -U tempest
root@e9762ca9a419:/# python -m pip install -U python-tempestconf
root@e9762ca9a419:/# python -m pip install -U neutron-tempest-plugin
root@e9762ca9a419:/# cd /root
root@e9762ca9a419:/# python -m pip install -U git client
root@e9762ca9a419:/# git clone https://github.com/openstack/neutron-tempest-plugin.git
```

We are set and secure to create our docker/buildah file [future articles]

[1]: https://github.com/redhat-openstack/nfv-tempest-plugin
[2]: https://github.com/containers/podman/issues/5526
[3]: https://www.unixarena.com/2013/12/how-to-increase-ulimit-values-in-redhat.html

[![HitCount](https://hits.dwyl.com/yarboa/yarboagithubio/podman-rootless-fd.svg?style=flat&show=unique)](http://hits.dwyl.com/yarboa/yarboagithubio/podman-rootless-fd)
