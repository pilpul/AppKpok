   
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
	localStorage: new Backbone.LocalStorage("kpoksettings"),
	defaults: {
		baseURL: "http://localhost:27080/mailkpok/",
		username: "USERNAME",
		password: "PASSWORD"
	}
	update :function(){
		this.set({baseURL: $('#baseURL').val(), username: $('#username').val(), password: $('#password').val() });
		this.save();
		$('#ConfigDialog').dialog('close');
	}
});

var Config = new ConfigSetting({id:	1});
Config.fetch();
console.log(Config.get("baseURL"))

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
    	today = new Date();
    	date = new Date(this.get('date'))
    	if (date.toDateString() == today.toDateString()){
    		return "archive_today"
    	}else if(date.getDate() == today.getDate()-1 && date.getMonth() == today.getMonth()){
    		//TODO: Yesterday could also have been the last day of another month
    		return "archive_yesterday"
    	}else if(date.getTime() > today.getTime()-(7*24*60*60*1000)	){
    		//TODO: last != "in the last seven days")
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
	  return milli.getTime();
	},

	update: function(){
		console.log('Requesting data ..')
		var baseURL = "";
		//Authentication TODO
		//"Cross Domain" Post messages only works in PhoneGap not in native browsers..
		$.post('Config.get('baseURL')+'/_authenticate', {"username":Config.get('username'), "password":Config.get('password')},function(data){}, 'json')
		.success(function(data){
			console.log(data)
		})
		//TODO This answers with a list of ALL keys. Better: Only send the changes
	    $.post(Config.get('baseURL')+'/mails/_find',function(data){
	    	//loading message
	    	console.log('Retrieving Maildatabase..')
	    	$.mobile.showPageLoadingMsg()
	    	//$('#archive_content').empty()
	    }, 'jsonp')
	    .success(function(data){
	    	if(data.ok != 1){
	    		console.error(data.errmsg);
	    	}else{
	    		
		    	newmails = 0;
		    	$.each(data.results, function(i, mail){
		    		//TODO: Request the last 10 Mails, make 'next page'; Mongo allows this with the _limit parameter
		    		//Only request those mails that are not already in the localStorage
		    		if(MailDB.where({date: mail.date}).length<1){
		    			newmails++;
		    			//console.log("Requesting id: "+mail.id)
		    			//$.get('http://localhost:5984/couchbdkit_test/'+mail.id, function(data){;
			    		//}, 'jsonp')
			    		//.success(function(data){
		        			newmail = new Mail(mail);
		    				MailDB.add(newmail)
		    				newmail.save();
		    				
			    			
			    		//})	
		    		}
		    		
		    	})
		    	console.log(newmails + ' new Items')
		    	App.render(); //re-render the app after updates from Databse
	    	}
	    	$.mobile.hidePageLoadingMsg()		    		
	    })	
	    .error(function(){
	    	console.error('Error connecting to database. See answer to request for details')
	    })		
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
	
	el: $("#MailList"),
	initialize: function() {
		MailDB.fetch(); //get it from local store TODO: should be applied at start with AppView Init
		console.log('Creating view');
		this.addAll()
	},
	addOne: function(mail) {		  
	      var view = new MailView({model: mail});
	      $("#archive_content").append(view.render().el);
	    },
	addAll: function() {
		  console.log("Adding all")
	      MailDB.each( this.addOne )
	    },
	render: function(){
		console.log("Re-rendering AppView")
		$('#archive_content').empty();
		this.addAll();
		//re-rendering the collapsibles with jQM
		$('div[data-role=collapsible]').collapsible({refresh:true});
	}
})


var App = new AppView;
