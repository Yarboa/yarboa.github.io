---

layout: post
title:  "s2i with podman"
date:   2024-03-25 12:11:08 +0200
categories: containers
---

# s2i as standalone from github repo and branch

This post shares some simple commands for using openshift s2i with podman
as a standalone django-app builder from github.
I was searching for some blogs, but did not find the accurate and updated
answer for that.

While I took this course
[Introduction to Red Hat OpenShift Applications (DO101)][1],
I realized how to make it work with additional [podman][3] knowledge,
and finally managed to make it work.
I will describe here the "what do to" inorder to get it work in a desktop
machine with django s2i example.

I will let [openshift s2i doc][2] and [s2i doc][3], to explain s2i builder.

## Links, helped getting started

That link give an idea of how it should work, [django-ex sample project][5]
running with python 3.5 and openshift quickstart.
I would like to run django-app with python 3.10,
podman search command called to help for finding python image answering
this requirement.
Below command searches for 3 images in quay.io repository.

```bash
podman search  --limit 3 quay.io/python-3

NAME                                                                                    DESCRIPTION
quay.io/fedora/python-311
quay.io/fedora/python-310
quay.io/redhat-user-workloads/open-data-hub-tenant/opendatahub/nb-base-ubi9-python-3-9  AppStudio repository for the use
```

## Run your prepared django project

From s2i and other documents this s2i command has failed.

```bash
s2i build https://github.com/Yarboa/beyond-tutorial quay.io/fedora/python-310 django-tutorial
FATAL: permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.43/version": dial unix /var/run/docker.sock: connect: permission denied
```

It seems that s2i which written in go, is using Docker API, but I have podman, instead.
As you may know or may not know podman is a wrapper of runc to fork and exec containers.
Docker has a client server model, it needs docker daemon.
I will let this old [more secure way for containers][6] to explain the difference.
The following question appears,
"Is a way to run/immitate docker daemon with podman on desktop host?

A bit more google searches brought this article [podman rest api][7]
and podman man to help.

```bash
man podman-system-service
```

## Prepare podman socket to work

Based on the previous section podman rest API could help here, lets try it.
There is a need for socket activation to interact with podman libpod,
it can also run as rootless daemon which is also cool and maybe replace docker.

``` bash
systemctl enable --user podman.socket
systemctl start --user podman.socket
systemctl status --user podman.socket
● podman.socket - Podman API Socket
     Loaded: loaded (/usr/lib/systemd/user/podman.socket; enabled; preset: disabled)
     Active: active (listening) since Sun 2024-04-07 20:29:05 IDT; 1s ago
   Triggers: ● podman.service
       Docs: man:podman-system-service(1)
     Listen: /run/user/1000/podman/podman.sock (Stream)
     CGroup: /user.slice/user-1000.slice/user@1000.service/app.slice/podman.socket

Apr 07 20:29:05 my-fedora systemd[2368]: Listening on podman.socket - Podman API Socket.
```

We could see that socket is active
Listen: /run/user/1000/podman/podman.sock

## Building an image with s2i again

Base on podman [man podman-system-service][8] It seems that
DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock, lets try to use it.

Now time to check it is up and running

``` bash
s2i build --ref=main --loglevel=5 -U unix://${XDG_RUNTIME_DIR}/podman/podman.sock https://github.com/Yarboa/beyond-tutorial quay.io/fedora/python-310 django-tutorial
I0407 19:23:36.270826   42805 build.go:52] Running S2I version "v1.3.8"
...
I0408 11:13:49.289318   96717 build.go:182] Build completed successfully
```

## Running image

```bash
podman images --format "{{.Names}}" | grep django-tutorial
[docker.io/library/django-tutorial:latest]

podman run --replace --name django-app -d -p 9090:9090 -it docker.io/library/django-tutorial bash -c "pip install django; python manage.py migrate; setsid python manage.py runserver 0.0.0.0:9090 > runserver.log"
46310345352dbc905b1d1fa658317809f24aa5c3b031668bc1638ab089556001

```

Verify by opening web browser <http://localhost:9090/>
You will see the login page.

[1]: https://www.credly.com/badges/121cd37b-40a5-4bcd-8a19-b841cb055b21
[2]: https://docs.openshift.com/container-platform/3.11/architecture/core_concepts/builds_and_image_streams.html#source-build
[3]: https://github.com/openshift/source-to-image/tree/master
[4]: https://github.com/Yarboa/beyond-tutorial
[5]: https://github.com/sclorg/django-ex/tree/master
[6]: https://opensource.com/article/18/10/podman-more-secure-way-run-containers
[7]: https://www.redhat.com/sysadmin/podman-rest-api
[8]: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html#examples
