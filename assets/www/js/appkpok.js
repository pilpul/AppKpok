   
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
		baseURL: "http://URL-SLEEPY.MONGOOSE:27080/DATABASE/",
		username: "USERNAME_WITH_READ_ACCESS",
		password: "USERS_PASSWORD"
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

	//Sorts the collection automatically by date
	comparator : function(mail) {
	  milli = new Date(mail.get("date"));
	  return -milli.getTime();
	},
	authenticate: function(){
    	//Authentication TODO
		//"Cross Domain" Post messages only works in PhoneGap not in native browsers..
		$.post(Config.get('baseURL')+'_authenticate', {"username":Config.get('username'), "password":Config.get('password')},function(data){
			console.log("authenticating")
		}, 'jsonp')
		.success(function(data){
			console.log(data.ok)
		})
		.error(function(){
			console.error('Error Authenticating')
		})
	},
	update: function(){
		//TODO backbone convention is to do this in 'fetch' an define URL parameters for the collection
		$.mobile.showPageLoadingMsg('b','Loading',false)
	    $.post(Config.get('baseURL')+'mails/_find?sort={"_id"%3A-1}', {'limit': 10}, function(data){}, 'jsonp')
	    	.success(function(data){
	    		//TODO make this work in something like this.bulkAdd() to be reusable
		    	if(data.ok != 1){
		    		console.error(data.errmsg);
		    	}else{
		    		console.log('processing answer..')
			    	newmails = 0;
			    	$.each(data.results, function(i, mail){
			    		if(MailDB.where({date: mail.date}).length<1){
			    			newmails++;
			        			newmail = new Mail(mail);
			    				MailDB.add(newmail)
			    				newmail.save();	
			    		}
			    	})
			    	console.log(newmails + ' new Items')
			    	App.render(); //re-render the app after updates from Database
		    	}
		    	$.mobile.hidePageLoadingMsg()	
	    	})
		    .error( function(){
		    	console.error('Error connecting to database. See answer to request for details')
		    	console.log('Trying (re-)authentication')
		    	this.authenticate();
		    }
	    )	
	},
	getOlder: function(){
		lastEntryNr = MailDB.length/10;
	    $.post(Config.get('baseURL')+'mails/_find?sort={"_id"%3A-1}', {'limit': 10, 'skip':MailDB.length}, function(data){}, 'jsonp')
	    .success(function(data){
	    	if(data.ok != 1){
	    		console.error(data.errmsg);
	    	}else{
	    		console.log('processing answer..')
		    	newmails = 0;
		    	$.each(data.results, function(i, mail){
		    		if(MailDB.where({date: mail.date}).length<1){
		    			newmails++;
		        			newmail = new Mail(mail);
		    				MailDB.add(newmail)
		    				newmail.save();	
		    		}
		    	})
		    	console.log(newmails + ' new Items')
		    	App.render(); //re-render the app after updates from Database
	    	}
	    	$.mobile.hidePageLoadingMsg()	
	    })
    	.error( function(){
	    	console.error('Error connecting to database. See answer to request for details')
	    	//this.authenticate();
	    })
	},
	bulkAdd: function(data){
		//This is somehow not referenceable from within the post.success' above
	}
});
var MailDB = new MailDBStore;

/**
 * Backbone-View: MailView
 * Description: View for a single "Mail"-Item; Rendes from a template in index.html
 * 
 */
var MailView = Backbone.View.extend({
	template: _.template($('#tplMailListEntry').html()),

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
})

/**
 * Backbone-View: AppView
 * Description: Renders the application simply by calling all Views 
 * 
 */
var AppView = Backbone.View.extend({
	tplArchiveDivider: _.template($('#tpl_archiveDividers').html()),
	
	el: $("#MailList"),
	
	initialize: function() {
		MailDB.fetch(); //get it from local store TODO: should be applied at start with AppView Init
		$('#archive_content').html(this.tplArchiveDivider());
		console.log('Creating view');
		this.addAll()
	},
	addOne: function(mail) {
	      var view = new MailView({model: mail});
	      $("#"+mail.dateCategory()).after(view.render().el);
	      //TODO when updating without reload the "after" pastes older mails BEFORE the newer ones..
	      $("#"+mail.dateCategory()).css('display','block')
	    },
	addAll: function() {
		  console.log("Adding everything from localStorage to View")
	      MailDB.each( this.addOne )
	    },
	render: function(){
		console.log("Re-rendering AppView")
		$('#archive_content').empty();
		$('#archive_content').html(this.tplArchiveDivider());
		this.addAll();
		//re-rendering the collapsibles with jQM
		//TODO the height of dividers is wrong after first refreshe
		$('div[data-role=collapsible]').collapsible({refresh:true});
	}
})


var App = new AppView;
