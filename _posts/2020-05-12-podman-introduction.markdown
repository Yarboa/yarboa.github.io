---
layout: post
title:  "Podman-introduction!"
date:   2020-05-12 11:51:08 +0200
categories: podman update
---


I would like share my experience with mariadb rootless podman installation based on [redhat.blog][4].  
The blog's explains how to podman with rootless permission.  
In this short blog, i will emphasis the differences for rootless. 
   
Benefits and difference of Podman vs Docker described in [opensource.com][2] 
In addition to security advantages, running podman in rootless show its maturity and reliability.


#### _**Installation RHEL/Centos 7.X**_

Refer the following [centos/podman][4] guide

#### _**Set and check host config**_

```bash
sudo -i
echo "user.max_user_namespaces=28633" > /etc/sysctl.d/userns.conf
sysctl -p /etc/sysctl.d/userns.conf

```
#### _**Set and check rootless user**_
```bash

podman unshare cat /proc/self/uid_map
podman unshare cat /proc/self/gid_map

output:
         0     1001          1
         1     165536      65536

#### Verify the following:
(undercloud) [stack@undercloud-0 ~]$ cat .config/containers/storage.conf 
[storage]
  driver = "overlay"
  runroot = "/run/user/1001"
```

Use mysql-data as local directory for data persistency.
Add mysql permision mysql to access the directory 

```bash

mkdir mysql-data
podman unshare chown 27:27 $(pwd)/mysql-data
ls -ltr of mysql-data
165562 165562 ... mysql-data
```
Run container

```bash

podman run -i -v $(pwd)/mysql-data:/var/lib/mysql/data:Z -e MYSQL_USER=user -e MYSQL_PASSWORD=pass -e MYSQL_DATABASE=db -p 3306:3306 -P registry.access.redhat.com/rhscl/mariadb-102-rhel7
```
container will run till stopped

#### _**Test it with python connection**_


```bash
netstat -nap | grep 3306
(Not all processes could be identified, non-owned process info
 will not be shown, you would have to be root to see it all.)
tcp        0      0 0.0.0.0:3306            0.0.0.0:*               LISTEN      17783/slirp4netns   
```

connect
pip install mysql # in your python virtualene

```bash
>>> import mysql \
>>> db = MySQLdb.connect(host="127.0.0.1", \
... user="user", \
... password="pass", \
... db="db") \
>>> cur = db.cursor() \
>>> cur.execute("CREATE TABLE users( \
... id INT NOT NULL, name VARCHAR(20) \
... NOT NULL, PRIMARY KEY (id) )")

```

[1]: https://developers.redhat.com/blog/2019/02/21/podman-and-buildah-for-docker-users/
[2]: https://opensource.com/article/19/2/how-does-rootless-podman-work?extIdCarryOver=true&sc_cid=7013a000002Dg5TAAS
[3]: https://www.redhat.com/sysadmin/behind-scenes-podman
[4]: https://www.redhat.com/sysadmin/rootless-podman-makes-sense 
[5]: https://podman.io/getting-started/installation.html

#### _**Further reading**_

[rh.dev.blog][1], [opensource.com][2], [redhat.blog][3], [redhat.blog][4] 

-------
