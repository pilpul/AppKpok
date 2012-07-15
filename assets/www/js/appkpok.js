
    var pictureSource;   // picture source
    var destinationType; // sets the format of returned value 

    // Wait for Cordova to connect with the device
    //
    document.addEventListener("deviceready",onDeviceReady,false);

    // Cordova is ready to be used!
    //
    function onDeviceReady() { 
        pictureSource=navigator.camera.PictureSourceType;
        destinationType=navigator.camera.DestinationType;
        $('#text').html('Ger&auml;te Infos:<br />Device Name: '     + device.name     + '<br />' + 
                'Device Platform: ' + device.platform + '<br />' + 
                'Device UUID: '     + device.uuid     + '<br />' + 
                'Device Version: '  + device.version  + '<br />')
    }
    

    // Called when a photo is successfully retrieved
    //
    function onPhotoDataSuccess(imageData) {
      // Uncomment to view the base64 encoded image data
      // console.log(imageData);

      // Get image handle
      //
      var smallImage = document.getElementById('smallImage');

      // Unhide image elements
      //
      smallImage.style.display = 'block';

      // Show the captured photo
      // The inline CSS rules are used to resize the image
      //
      smallImage.src = "data:image/jpeg;base64," + imageData;
      
      navigator.notification.alert(
    		    'Top!',  // message
    		    alertDismissed,         // callback
    		    'Did it',            // title
    		    'Done'                  // buttonName
    		);
    }

    // Called when a photo is successfully retrieved
    //
    function onPhotoURISuccess(imageURI) {
      // Uncomment to view the image file URI 
      // console.log(imageURI);

      // Get image handle
      //
      var largeImage = document.getElementById('largeImage');

      // Unhide image elements
      //
      largeImage.style.display = 'block';

      // Show the captured photo
      // The inline CSS rules are used to resize the image
      //
      largeImage.src = imageURI;
    }

    // A button will call this function
    //
    function capturePhoto() {
      // Take picture using device camera and retrieve image as base64-encoded string
      navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 50,
        destinationType: destinationType.DATA_URL });
    }

    // A button will call this function
    //
    function capturePhotoEdit() {
      // Take picture using device camera, allow edit, and retrieve image as base64-encoded string  
      navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 20, allowEdit: true,
        destinationType: destinationType.DATA_URL });
    }

    // A button will call this function
    //
    function getPhoto(source) {
      // Retrieve image file location from specified source
      navigator.camera.getPicture(onPhotoURISuccess, onFail, { quality: 50, 
        destinationType: destinationType.FILE_URI,
        sourceType: source });
    }

    // Called if something bad happens.
    // 
    function onFail(message) {
      alert('Failed because: ' + message);
    }

    
/**
 * @author: pilpul3000
 * App Kpok - Mailinglisten Archive
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
	    			
	    			console.log("Requesting id: "+mail.id)
	    			$.get('http://localhost:5984/couchbdkit_test/'+mail.id, function(data){;
		    		}, 'jsonp')
		    		.success(function(data){
		    			newmails ++;
	        			newmail = new Mail(data);
	    				MailDB.add(newmail)
	    				newmail.save();
		    			
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
