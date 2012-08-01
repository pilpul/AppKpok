##Disclaimer
This is a simple app to improve my JavaScript skills.
I'll try to comment as good as possible, but this is work-in-progress/alpha/whatever-you-call-it.

##What it does: 

Mails to our mailinglist are pushed to a mongoDB (code not yet released). The app(-to-be) fetches it from there, save them to the localStorage of the browser and displays them.
At the moment this is a webapp that runs in any (uptodate) browser. Phonegap makes installable APKs and may later be used to access native Android functionalities.

##I'm using

* [PhoneGap](http://www.phonegap.com), (so all I did by myself is in assets/www)
* [jQuery](http://www.jquery.com) and [jQuery Mobile](http://www.jquerymobile.com)
* [Backbone.js](http://documentcloud.github.com/backbone/) (requires underscore.js) with [localStorage](https://github.com/jeromegn/Backbone.localStorage) for 'clean' MVC-JavaScript code
* Additional plugins used are [Hammer.js](https://github.com/eightmedia/hammer.js), jjoe64s [Holo Theme](https://github.com/jjoe64/jquery-mobile-android-themes)
* The database is a [mongoDB](https://mongodb.org/) instance with [sleepy.mongoose](https://github.com/kchodorow/sleepy.mongoose) as REST-Interface

##Changelog
20120801: Changed to mongoDB Backend.