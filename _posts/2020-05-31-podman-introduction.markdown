---
layout: post
title:  "Run-rootless-jenkins-podman!"
date:   2020-05-31 19:11:08 +0300
categories: podman update
---

As previous post [Podman.introduction][1], i realized the security benefits of running container
in rootless user environment.

While jenkins is common tool for automating and scheduling repeated tasks, even for sw developer.  
I found this nice link [podman.jenkins][2], but i did not understand whether it is rootless
or rooted container, based on the sample and tried to run it rootles.

#### _**Verify cgroups of rootles user are ok**_

```bash
[stack@RHEL7 ~]$ podman unshare cat /proc/self/uid_map
      0      27912          1
      1     200000      65536
```

In case there is only one line in the out put, please look here [redhat][3],
Try to verify and download an image

```bash
[stack@RHEL7 ~]$ podman pull ubi7/ubi
Trying to pull registry.access.redhat.com/ubi7/ubi...
Getting image source signatures
Copying blob 82a8f4ea76cb [--------------------------------------] 0.0b / 0.0b
Copying blob a3ac36470b00 [--------------------------------------] 0.0b / 72.7MiB
Copying config d36cb7ab60 done  
Writing manifest to image destination
Storing signatures
d36cb7ab60042e6687e221c9bfdc4b0c674e7753cff56f71bc3bd66e957598cc
```
If no error occured we can continue with jenkins.

#### _**Follow jenkins simple steps**_

Track the following [podman.jenkins][2]

Either use podman volume create for data persistence, refere previous blog related to directory 
ownership, or use local directory, similar to the blog

```bash
[stack@RHEL7 ~]$ podman volume create jenkins-data
jenkins-data
[stack@RHEL7 ~]$ podman volume create jenkins-docker-certs
jenkins-docker-certs 

podman container run  --name jenkins-blueocean   --rm   --detach   --privileged   -p 8080:8080  -p 50000:50000 -v jenkins-data:/var/jenkins_home  -v jenkins-docker-certs:/certs/client:ro jenkinsci/blueocean
```

Connect into the container through:
```bash
[stack@RHEL7 ~]$ podman ps
CONTAINER ID  IMAGE                                 COMMAND  CREATED             STATUS                 PORTS                   NAMES
763cc5ae7547  docker.io/jenkinsci/blueocean:latest           About a minute ago  Up About a minute ago  0.0.0.0:8080->8080/tcp  jenkins-blueocean

[stack@RHEL7 ~]$ podman exec -ti 763cc5ae7547 /bin/bash
bash-4.4$ 

cat /var/jenkins_home/secrets/initialAdminPassword
8ef0941e670f4971bf1c34ff3fa0e6c1
```

#### _**Test permissions**_

Default user is jenkins, and perissions were set accordingly.

```bash
[stack@RHEL7 ~]$ podman exec -ti 763cc5ae7547 /bin/bash
bash-4.4$ 
bash-4.4$ id
uid=1000(jenkins) gid=1000(jenkins) groups=1000(jenkins)
bash-4.4$ echo "" > /var/jenkins_home/Hello.txt
bash-4.4$ ls -ltr /var/jenkins_home/Hello.txt
-rw-r--r-- 1 jenkins jenkins 1 Jun  1 15:37 /var/jenkins_home/Hello.txt

bash-4.4$ echo "" > /certs/client/Hello.txt
bash: /certs/client/Hello.txt: Read-only file system

```

#### _**Test remote connections**_


Now lets find jenkins IP ADDRESS and set firewall rules, rootles container, the use must set firwall rules

```bash
JENKINS=hostname -I | awk '{print $1}'
firewall-cmd --add-port=8080/tcp
firewall-cmd --permanent --add-port=8080/tcp

```

```bash

curl $JENKINS:8080
```

We are set and secure to unlock Admin password
 


[1]: https://yarboa.github.io/podman/update/2020/05/12/podman-introduction.html
[2]: https://8gwifi.org/docs/podman-jenkins.jsp
[3]: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux_atomic_host/7/html/managing_containers/finding_running_and_building_containers_with_podman_skopeo_and_buildah#running_containers_as_root_or_rootless