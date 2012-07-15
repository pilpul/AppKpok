   
/**
 * @author: Pilpul Kpok
 * URL
 * App Kpok - Mailinglisten Archive-viewer
 * The nackend code is not yet published but it just parses mails coming in from exim to a couchdb database
 * @License: GPLv3
 */

	
/**
 * Backbone-Model: Mail
 * Description: Model for an e-mail.  
 * Attributes: Subject, Content, Date, From, To
 */
var Mail = Backbone.Model.extend({

    defaults: {
        content: "empty mail...",
        date: "today",
        from: "noone wrote this mail",
        subject: "empty subject",
        to: "no one received it"
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
 * Description: Interface to localStorage and to couchDB Database of the server
 * 
 */
var MailDBStore = Backbone.Collection.extend({
	model: Mail,
	localStorage: new Backbone.LocalStorage("kpokmailarchive"),

	update: function(){
		//TODO: Make couchdb to answer only if credentials are provided
		console.log('Requesting data ..')
		var baseURL = "";
		//TODO This answers with a list of ALL keys. Better: Only send the changes
	    $.post('http://localhost:5984/couchbdkit_test/_all_docs',function(data){
	    	//loading message
	    	console.log('Retrieving Maildatabase..')
	    	$.mobile.showPageLoadingMsg()
	    	//$('#archive_content').empty()
	    }, 'jsonp')
	    .success(function(data){
	    	newmails = 0;
	    	$.each(data.rows, function(i, mail){
	    		//TODO: Request the last 10 Mails, make 'next page' links 
	    		//Only request those mails that are not already in the localStorage
	    		
	    		if(MailDB.where({_id: mail.id}).length<1){
	    			newmails++;
	    			console.log("Requesting id: "+mail.id)
	    			$.get('http://localhost:5984/couchbdkit_test/'+mail.id, function(data){;
		    		}, 'jsonp')
		    		.success(function(data){
	        			newmail = new Mail(data);
	    				MailDB.add(newmail)
	    				newmail.save();
	    				App.addOne({model: newmail}); //TODO make it work!
		    			
		    		})	
	    		}
	    		
	    	})
	    	console.log(newmails + ' new Items')
	    	$.mobile.hidePageLoadingMsg()
	    })	
	    .error(function(){
	    	console.error('Error retrieving database. See answer to request for details')
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
	      //TODO Sort in the right place
	    },
	addAll: function() {
		  console.log("Adding all")
		  //TODO Sort by date!
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
