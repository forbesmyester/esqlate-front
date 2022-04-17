# eSQLate Front

eSQLate Front provides a web interface for the [eSQLate Projects](https://github.com/forbesmyester/esqlate) API Server [eSQLate Server](https://github.com/forbesmyester/esqlate-server).

## Installation

First install and configure [eSQLate Server](https://github.com/forbesmyester/esqlate-server).

Then you must set up the following environmental variables:

 * `LISTEN_PORT` - The port number you wish eSQLate Front to listen on.
 * `API_SERVER` - The HTTP root of the [eSQLate Server](https://github.com/forbesmyester/esqlate-server). NOTE: should not include final `/`. It is probably something like `http://localhost:8803`.

Install the OS dependencies:

```bash
# The below is for Ubuntu / Debian but we really just need to serve files over HTTP.
sudo apt install parallel
npm install
npm run-script build
sudo apt install lighttpd
sudo systemctl disable lighttpd
lighttpd -f lighttpd.conf -D
```

As you can see there is nothing too weird there so feel free to use whatever HTTP/HTTPS server you wish.

Once this is complete you can visit http://localhost:[LISTEN_PORT]/ to use eSQLate.

## Contributors

Thank you

 * @richrd - Support for showing results in Extended Display mode
 * @richrd - Support for displaying JSONB #1

## Credits

 * Created using [Svelte](https://svelte.dev/).
 * Some colors taken from [base-16](http://chriskempson.com/projects/base16/) and then mangled by me to make them ~~worse~~ different.
 * TDD framework from [Tape](https://github.com/substack/tape).
 * The routing is via [Flatiron Director](https://github.com/flatiron/director).
 * Thank you Microsoft for joining the Open Source movement and giving us [TyeScript](https://www.typescriptlang.org/)
 * This is my fifth-ish [Spectre CSS](https://picturepan2.github.io/spectre/) based project.

## License

This project (all code in this repository) is listed under GPLv3 or later
