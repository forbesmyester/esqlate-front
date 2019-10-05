#!/bin/bash

git clone git@github.com:forbesmyester/esqlate-milligram.git ../esqlate-milligram
npm install
ln -s ../esqlate-milligram/dist css
npm install node-sass
node-sass index.scss > index.css
bash -c 'cd ../esqlate-milligram && npm install && npm run-script build'
sudo apt install lighttpd
sudo systemctl disable lighttpd
webpack
lighttpd -f lighttpd.conf -D
