smartnet-player
===============

A NodeJS based website that allows for the playback of captured SmartNet II Radio Transmissions

# Getting Started

## Install and Setup MongoDB

Install MongoDB following instructions for your platform (Mac, Specific Linux distro)

Create a new database user
``
$ mongo
MongoDB shell version: 3.2.10
connecting to: test
> use scanner;
switched to db scanner
> db.createUser({'user':'scanner', 'pwd':'vcW6rEixic3kdBWj', roles:['readWrite']});
Successfully added user: { "user" : "scanner", "roles" : [ "readWrite" ] }
>
``

## Install npm & dependencies
Go to http://nodejs.org and install NodeJS

And then use the ``packages.json`` in the repo to install the project's dependencies
``npm install``

## Configure and run
Edit the local ``config.js``. The twitter auth keys can be left as placeholders to start.

Run the server
``node ./index.js``

And load up http://localhost:3004 in your browser.
