# Esqlate Front

Esqlate Front provides a web interface for the [Esqlate Projects](https://github.com/forbesmyester/esqlate) API Server, [Esqlate Server](https://github.com/forbesmyester/esqlate-server).

# Installation

First install and configure [Esqlate Server](https://github.com/forbesmyester/esqlate-server).

Once that is complete you will need to set up the following environmental variables:

 * `LISTEN_PORT`
 * `API_SERVER`

Once this is complete the following can be used to install on an Ubuntu or Debian based system:

```bash
npm install
npm run-script build
sudo apt install lighttpd
sudo systemctl disable lighttpd
lighttpd -f lighttpd.conf -D
```

As you can see there is nothing too weird there so feel free to use whatever HTTP/HTTPS server you wish.

Once this is complete you can visit http://localhost:[LISTEN_PORT]/ to use Esqlate
