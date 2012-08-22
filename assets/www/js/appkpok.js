   
/**
 * @author: Pilpul Kpok
 * URL
 * App Kpok - Mailinglisten Archive-viewer
 * The nackend code is not yet published but it just parses mails coming in from exim to a couchdb database
 * @License: GPLv3
 */


/* TODO This config model can be access by the 'options' icon on the archive page. 
 * username and password to access the database can be set here and should be stored in localStorage
 */
var ConfigSetting = Backbone.Model.extend({
	localStorage: new Backbone.LocalStorage("settings"),
	defaults: {
		baseURL: "http://YOURSERVER:27080/DATEBASE/",
		username: "USERNAME WITH READ ACCESS",
		password: "PASSWORD",
		energy: "no"
	},
	update :function(){
		this.set({baseURL: $('#baseURL').val(), username: $('#username').val(), password: $('#password').val() });
		this.save();
		$('#ConfigDialog').dialog('close');
	}
});

var Config = new ConfigSetting({id:	1});
Config.fetch();

$( '#ConfigDialog' ).live( 'pageinit',function(event){
  $('#baseURL').val(Config.get("baseURL"))
  $('#username').val(Config.get("username"))
  $('#password').val(Config.get("password"))
});

	
/**
 * Backbone-Model: Mail
 * Description: Model for an e-mail.  
 * Attributes: Subject, Content, Date, From, To
 */
var Mail = Backbone.Model.extend({

    defaults: {
        message: "empty mail...",
        date: "someday",
        from: "no one",
        subject: "empty subject",
        html: "no html",
        body: "no body"
      },
    
	initialize: function() {
		
	},	
	allowedToEdit: function(account) {
	    return true;
	  },
    dateCategory: function(){
    	daysPerMonth = new Array(31,28,31,30,31,30,31,31,30,31,30,31)
    	now = new Date();
    	date = new Date(this.get('date'))
    	if (date.toDateString() == now.toDateString()){
    		return "archive_today"
    	}else if( (   date.getDate() == now.getDate()-1 && date.getMonth() == now.getMonth()  ) 
    			    || date.getDate() == daysPerMonth[now.getMonth()-1] && now.getDate()==0){
    		return "archive_yesterday"
    	}else if(date.getTime() > now.getTime()-(7*24*60*60*1000)	){
    		return "archive_lastweek"
    	}else{
    		return "archive_old"
    	}
    },
    clear: function() {
        this.destroy();
      }
})   

/**
 * Backbone-Collection: MailDBStore
 * Description: Interface to localStorage and to MongoDB Database of the server
 * 
 */
var MailDBStore = Backbone.Collection.extend({
	model: Mail,
	localStorage: new Backbone.LocalStorage("kpokmailarchive"),
	initialize: function(){
		this.authenticate();
	},
	//Sorts the collection automatically by date
	comparator : function(mail) {
	  milli = new Date(mail.get("date"));
	  return -milli.getTime();
	},
	authenticate: function(){
    	//Authentication TODO
		//"Cross Domain" Post messages only works in PhoneGap not in native browsers..
		$.post(Config.get('baseURL')+'_authenticate', {"username":Config.get('username'), "password":Config.get('password')},function(data){
			console.log("Authenticating")
		}, 'json')
		.success(function(data){
			console.info(data.ok)
		})
		.error(function(){
			App.alert('Probleme mit der Verbindung zur Cloud.. probier es später nochmal', 'Sorry, Fehler!', console.error('Error Authenticating'))
		})
	},
	update: function(){
		//TODO backbone convention is to do this in 'fetch' an define URL parameters for the collection
		$.mobile.showPageLoadingMsg('b','Loading',false)
	    $.post(Config.get('baseURL')+'mails/_find?sort={"_id"%3A-1}', {'limit': 10}, function(data){}, 'jsonp')
	    	.success(function(data){
		    	newitems = MailDB.bulkAddToLocalDB(data);
		    	msg = "";
		    	if(newitems == 1){
		    		msg = newitems + " neue Mail";
		    	}else{
		    		msg = newitems + " neue Mails";
		    	}
		    	App.alert(msg, 'Update abgeschlossen', console.log('alert dismissed'))
	    	})
		    .error( function(){
		    	console.error('Error connecting to database. See answer to request for details')
		    	$.mobile.hidePageLoadingMsg()
		    }
	    )	
	},
	getOlder: function(){
		lastEntryNr = MailDB.length/10;
	    $.post(Config.get('baseURL')+'mails/_find?sort={"_id"%3A-1}', {'limit': 10, 'skip':MailDB.length}, function(data){}, 'jsonp')
	    .success(function(data){
	    	newitems = MailDB.bulkAddToLocalDB(data);
	    	msg =  newitems + " alte Mails am Ende der Liste hinzugefügt";
	    	App.alert(msg, 'Update abgeschlossen', console.log('alert dismissed'))
	    })
    	.error( function(){
	    	console.error('Error connecting to database. See answer to request for details')
	    	MailDB.authenticate();
	    	$.mobile.hidePageLoadingMsg()	
	    })
	},
	bulkAddToLocalDB: function(data){
		newmails = 0;
		console.log('processing answer..')
    	if(data.ok != 1){
    		console.error(data.errmsg);
	    	console.log('Trying (re-)authentication')
	    	this.authenticate();
    	}else{
	    	$.each(data.results, function(i, mail){
	    		if(MailDB.where({date: mail.date}).length<1){
	    			newmails++;
	        			newmail = new Mail(mail);
	    				MailDB.add(newmail)
	    				newmail.save();	
	    		}
	    	})
	    	console.info('Added '+ newmails + ' new items')
	    	MailApp.render(); //re-render the app after updates from Database
    	}
    	$.mobile.hidePageLoadingMsg()
    	return newmails;
	},
	getTopics: function(){
		/*
		 * Idea: compute something like a tag list or hot topics
		 */
	}
});


/**
 * Backbone-View: MailView
 * Description: View for a single "Mail"-Item; Rendes from a template in index.html
 * 
 */
var MailView = Backbone.View.extend({
	template: _.template($('#tplMailListEntry').html()),

    render: function() { 
    	date = new Date(this.model.get('date'));
        this.$el.html(this.template({
        	'id': this.model.get('id'),
        	'message': this.model.get('message'),
        	'body': this.model.get('body'),
        	'html': this.model.get('html'),
        	'from': this.model.get('from'),
        	'subject': this.model.get('subject'),
        	'date':date.toLocaleDateString(),
        	'day': date.getDate()+'.'+(date.getMonth()+1)+'.'+date.getFullYear(),
        	'time': date.getHours()+':'+date.getMinutes()
        }));
        return this;
    }
})

/**
 * Backbone-View: MailAppView
 * Description: Renders the application simply by calling all Views 
 * 
 */
var MailAppView = Backbone.View.extend({
	tplArchiveDivider: _.template($('#tpl_archiveDividers').html()),
	
	el: $("#MailList"),
	
	initialize: function() {
		MailDB.fetch(); //get it from local store TODO: should be applied at start with AppView Init
		$('#archive_content').html(this.tplArchiveDivider());
		console.log('Creating view');
		this.addAll()
	},
	// Adds one MailDB element as an element to the list sorted  by dateCategory (today, yesterday, last week, older)
	addOne: function(mail) {
	      var view = new MailView({model: mail});
	      $("#"+mail.dateCategory()).append(view.render().el);
	      $("#"+mail.dateCategory()).css('display','block')
	    },
	addAll: function() {
		  console.log("Adding everything from localStorage to View")
	      MailDB.each( this.addOne )
	    },
	render: function(){
		console.log("Re-rendering MailAppView")
		$('#archive_content').empty();
		$('#archive_content').html(this.tplArchiveDivider());
		this.addAll();
		//re-rendering the collapsibles with jQM
		//TODO the height of dividers is wrong after first refreshe
		$('div[data-role=collapsible]').collapsible({refresh:true});
	},
	deleteLocalMailStorage: function(){
		//TODO Only delete mail DB not Settings
		console.info('Delete all Mails localStorage')
		while(MailDB.length>0){ //this has to be done several times since on "each" round does not clear fully
			MailDB.each( this.deleteOne )
		}
		$('#deleteLocalMails').children().children().addClass('ui-icon-check');
		$('#deleteLocalMails').children().children().eq(0).html('Lokaler Mail Speicher gelöscht');
		this.render();
	},
	deleteLocalStorage: function(){
		console.info('Delete all data from localStorage')
		localStorage.clear();
		$('#deleteLocalStorage').children().children().addClass('ui-icon-check');
		$('#deleteLocalStorage').children().children().eq(0).html('Lokaler Speicher gelöscht');
		window.location.reload();
	},
	deleteOne: function(mail){
		mail.clear()
	}
})


/**
 * Termine
 */


var DateView = Backbone.View.extend({
	tplMeetNote: _.template($('#tpl_nextMeet').html()),
	parent: $('#meetText'),
	initialize: function(){
		console.log('init Dateview')
		this.parent.empty();
		$.get(Config.get('baseURL')+'dates/_find?sort={"_date"%3A1}', _.bind(function(data){
			_.each(data.results, _.bind(function(meet){
				d = new Date(meet.date);
				t = new Date();
				dif = d.getTime()-t.getTime();
				dif = Math.ceil(dif/1000/60/60/24);
				if(dif>0){
					this.parent.append(this.tplMeetNote({'title': meet.title, 'date':meet.date, 'dif': dif}))
				}
			}, this))
		}, this), 'jsonp')
		.error(function(){
			App.alert('Kann die Termine nicht laden!')
		})

	}
})



var AppView = Backbone.View.extend({
	isMobileDevice : false,
	initialize: function(){
		//Initialize the energy-level part of the app
		var backgroundposition = {'no':-96, '0':0, '20':-192, '40':-288, '60':-384,'80':-480,'100':-576}
		$('.kpok-energy-slider-img').css('background-position', backgroundposition[Config.get('energy')] );
		//this is a workaroud because jQM got confused when initializing with the energy value from localstorage
		$('#slider-kpok').slider()
		$('#slider-kpok').val(Config.get('energy'))
		$('#slider-kpok').slider('refresh')

		$('#slider-kpok').bind( "change", function(){
			val = $('#slider-kpok').val();
			Config.set('energy',val);
			Config.save();			
			$('.kpok-energy-slider-img').css('background-position', backgroundposition[Config.get('energy')] )
		})


	},
	alert: function(message, title, callback){
		if(this.isMobileDevice){
			navigator.notification.alert(message, callback, title);
		}else{
			alert(message);
		}
	}
})
var App, MailDB, MailApp, DateApp
App = new AppView;
MailDB = new MailDBStore;
MailApp = new MailAppView;
DateApp = new DateView;

//This is the jQM Version of $(function(){})
$(document).bind('pageinit', function(){
	document.addEventListener("deviceready", onDeviceReady, false);
})

function onDeviceReady() {
	App.isMobileDevice = true;
    string = 'Device Name: '     + device.name     + '<br />' + 
                        'Device Cordova: '  + device.cordova + '<br />' + 
                        'Device Platform: ' + device.platform + '<br />' + 
                        'Device UUID: '     + device.uuid     + '<br />' + 
                        'Device Version: '  + device.version  + '<br />';
    $('#text').html(string)
}
