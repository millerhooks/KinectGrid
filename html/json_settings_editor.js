/*
 * Identify values (second key) of some
 * entryes (first key) with strings.
 * */
TOKENS = {
	"modeState" : [
	"HAND_DETECTION",
	"AREA_DETECTION",
	"AREA_DETECTION_START",
	"AREA_DETECTION_END",
	"DEPTH_MASK_DETECTION",
	"REPOKE_DETECTION",
	"SAVE_MASKS",
	"LOAD_MASKS",
	"QUIT",
	"RGB",
	"NUM_FUNCTION_MODES"  
	],

	"viewState" : [
		"VIEW_NONE",
		"VIEW_DEPTH",
		"VIEW_MASK",
		"VIEW_FILTERED",
		"VIEW_AREAS",
		"VIEW_FRONTMASK",
		"VIEW_RGB",
		"NUM_VIEWS" 
	], 

	/* Label and Description for some property names */
	"props" : {
		"date" : { "label" : "Date", "desc" : "Creation time." },
		"withMask" : { "label" : "Masks:", "desc" : "Setting includes predifined masks (for frameless mode)." },
	}
}

/* (C++)  DISPLAY_MODE_[m] <=> (JS) DISPLAY_MODES[m] */
DISPLAY_MODES = {
	"NONE" : 0,
	"CV" : 1, // use OpenCV highgui for drawing window
	"WEB": 2, //For webinterface 
	"DIRECTFB" : 3, //for non-X11 env, not implemented
}

/* (C++) HTTP_ACTION_[m] <=> (JS) HTTP_ACTIONS[m] */
HTTP_ACTIONS = {
	"UPDATE_CONFIG" : 0,
	"LOAD_CONFIG" : 1,
	"SAVE_CONFIG" : 2,
	"SET_AREA_DETECTION" : 3,
	"REPOKE" : 4,
	"SELECT_VIEW" : 5,
	"SAVE_MASKS" : 6,
	"LOAD_MASKS" : 7,
	"QUIT_PROGRAM" : 8,
	"RESET_CONFIG" : 9,
	"GET_PREVIEW_IMAGE" : 10,
	"REGENERATE_MASKS" : 12,
	"AREA_DETECTION_CLICK" : 13,
}


/* maximal number of lines in the messages
 * textarea.
 * */
TEXTAREA_MAX_LINES = 300;

/* Period between reload of settings */
REFRESH_INTERVAL_MS = 1000

/* Period between reload of settings if previous connection attemt failed. */
REFRESH_INTERVAL_MS_OFFLINE = 5000

/* Backup of last state. Used in format_state */
last_state = -1;

/* Flag enable prompts to avoid clicks by accident.
 */
request_confirmation = false;

/* Number of open job files, unused. */
open_files = 0;

/* Init setTimeout reference holder */
if( typeof refreshTimeout == 'undefined' ) refreshTimeout = null; 

/* Some operation should invoke an automatic update of the preview image. */
forceImageUpdate = false; 

/* Fill in json values on desired
 * positions on the page. Raw values
 * will wrapped by some dynamic html stuff.
 */
function create_fields(json){
	cu_fields(json,"create");
}

/* Take content of json file
 * to update values on the page.
 */
function update_fields(json){
	cu_fields(json,"update");

	// show preview image if available
	if( json.display == DISPLAY_MODES["WEB"] ){
		$("#web_preview").css({"display":"block"});
		$("#no_web_preview").css({"display":"none"});
	}else{
		$("#web_preview").css({"display":"none"});
		$("#no_web_preview").css({"display":"block"});
	}
}

function cu_fields(obj,prefix){
	//convert input arg to object, if string representation given.
	//var obj = (typeof json_obj === "string"?JSON.parse(json_obj):json_obj);

	if( typeof obj.html === "object" )
		for(var i=0; i<obj.html.length; i++){
			var o = obj.html[i];
			if( typeof o.type === "string"  /* type=intField, doubleField,... */
					&& typeof window[prefix+"_"+o.type] === "function"
					&& typeof $("#"+o.id) === "object"
				) {
					/* Connect (new) json obj with the container element.
					 * Attention, if you create some event handlers in the
					 *	create_[...] functions do not depend on the object
					 *	'o'. Use $("#"+id+).prop("json").
					 *	Reparsing of json string creates new objects!
					 */
					pnode = $("#"+o.id);
					pnode.prop("json", o);
					(window[prefix+"_"+o.type])(o, pnode );

					if( prefix == "create" ){
						propName = $('<span>'+o.id+': </span>');
						propName.addClass("propName");
						pnode.prepend(propName);
					}
				}else{
					//alert("Can not "+prefix+" field "+o.id+".");
				}
		}
}


function create_intField(obj, pnode){
	var description = "Id: "+obj.id+", Min: "+format(obj,obj.min)+", Max: "+format(obj,obj.max);
	//var description = description + " Diff: "+obj.diff;
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	ret.addClass("json_input");

	//format value
	var val = format(obj,obj.val);

	var inputfield = $('<input id="'+obj.id+'_" value="'+val
			+(obj.readonly==0?'" ':'" readonly="readonly"')
			+'" size="6" />');

	if( obj.readonly!=0 ) $("#"+obj.id).addClass("readonly");

	// prevvalue property: backup of value to compare on changements.
	inputfield.prop("prevvalue", val);

	/* jQuery: .change fires if element lost focus. .input fires on every change. */
	inputfield.bind('input',
			function(event){
				if(check_intField(pnode.prop("json"), this.value)){
					//unset red property
					pnode.removeClass("red");
				}else{
					//mark element red
					pnode.addClass("red");
				}
			});
	//add event for element leave....
	inputfield.change( function(event){
		var o = pnode.prop("json");
		if(check_intField(o, this.value)){
			inputfield.prop("prevvalue", this.value);
			o.val = parse(o,this.value);
			send_setting();
		}else{
			//reset value.
			this.value = inputfield.prop("prevvalue");
			pnode.removeClass("red");
		}
	});

	inputfield.hover( function(event){
		this.focus();
	},
	function(event){
		//this.blur();//unfocus element

		var o = pnode.prop("json");
		if( o.val != parse(o,this.value) ) inputfield.trigger('change');
	});

	inputfield.bind('mousewheel', function(event, delta) {

		var dir = delta>0?1:-1;
		var o = pnode.prop("json");
		if(o.readonly) return false;

		var prevVal = parse(o,this.value);
		var nextVal = prevVal + parseInt(dir*o.diff);

		//cut low and high values
		nextVal = o.min>nextVal ? o.min:((nextVal<o.max)?nextVal:o.max);

		var nextValStr = format(o,nextVal);

		//check if new value is valid.
		if(check_intField(o, nextValStr)){
			this.value = nextValStr;
		}

		return false;
	});

	inputfield.bind('keyup', function(event) {

		var o = pnode.prop("json");
		if(o.readonly) return false;

		var accel =0;
		switch( event.which ){
			case 37: /*Left key */
				accel =-1;
				break;
			case 39: /*Right key */
				accel =1;
				break;
			case 38: /*Up key */
				accel =10;
				break;
			case 40: /*Down key */
				accel =-10;
				break;
			case 33: /*PageUp key */
				accel =10000;
				break;
			case 34: /*PageDown key */
				accel =-10000;
				break;
			case 13: /* Enter */
				inputfield.blur();
				return false;
				break;
			default:
				return false;
				break;
		}


		var prevVal = parse(o,this.value);
		var nextVal = prevVal + parseInt(accel*o.diff);

		//cut low and high values
		nextVal = o.min>nextVal ? o.min:((nextVal<o.max)?nextVal:o.max);

		var nextValStr = format(o,nextVal);

		//check if new value is valid.
		if(check_intField(o, nextValStr)){
			this.value = nextValStr;
			//send updated values to server
			var o = pnode.prop("json");
			if( o.val != nextVal ) inputfield.trigger('change');
		}

		return false;
	});

	function gen_change_button_handler(speed, text, cssClass){
		button = $('<input type="button" value="'+text+'" />');
		button.addClass(cssClass);
		button.bind('click', 
				function(event) {

					var o = pnode.prop("json");
					if(o.readonly) return false;

					var prevVal = parse(o,inputfield.val());
					var nextVal = prevVal + parseInt(speed*o.diff);

					//cut low and high values
					nextVal = o.min>nextVal ? o.min:((nextVal<o.max)?nextVal:o.max);

					var nextValStr = format(o,nextVal);

					//check if new value is valid.
					if(check_intField(o, nextValStr)){
						inputfield.val(nextValStr);
						//send updated values to server
						var o = pnode.prop("json");
						if( o.val != nextVal ) inputfield.trigger('change');
					}
					return false;
				});
		return button;
	}

	m1 = gen_change_button_handler(-1, "−−−", "propBtn" );
	m2 = gen_change_button_handler(-0.1, "−−", "propBtn" );
	m3 = gen_change_button_handler(-0.01, "−", "propBtn" );
	m4 = gen_change_button_handler( 0.01, "+", "propBtn" );
	m5 = gen_change_button_handler( 0.1, "++", "propBtn" );
	m6 = gen_change_button_handler( 1, "+++", "propBtn" );

	container = $('<div />');
	container.addClass('propContainer');

	container.prepend( m3 );
	container.prepend( m2 );
	container.prepend( m1 );
	ret.append( inputfield );
	container.append( ret );
	container.append( m4 );
	container.append( m5 );
	container.append( m6 );

	pnode.append( container );
}


function update_intField(obj){
	var val = format(obj,obj.val);
	var inputfield = $("#"+obj.id+"_");
	var prev = inputfield.prop("prevvalue");
	/* This check omit the automaticly change of field
	 * which currently changed by the user.
	 */
	if( val != prev && prev == inputfield.val() ){
		if( inputfield.val() != val ){
			inputfield.val(val);
			inputfield.prop("prevvalue", val);
			inputfield.trigger('input');
		}
	}
	//set readonly flag
	var ro = obj.readonly;
	inputfield.prop("readonly", ro );
	if( ro ) $("#"+obj.id).addClass("readonly");
	else $("#"+obj.id).removeClass("readonly");
}

/* o is subelement of json obj
 * Checks if val
 * */
function check_intField(o, val){
	//var i = parseInt(parse(o,val));
	var i = parse(o,val);
	//var i = parseInt(val);
	if( ! isFinite(i) ) return false;
	if( i < o.min ) return false;
	if( i > o.max ) return false;
	return true;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

function create_doubleField(obj, pnode){
	var description = "Id: "+obj.id+", Min: "+format(obj,obj.min)+", Max: "+format(obj,obj.max);
	//var description = description + " Diff: "+obj.diff;
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	ret.addClass("json_input");

	//format value
	var val = format(obj,obj.val);

	var inputfield = $('<input id="'+obj.id+'_" value="'+val
			+(obj.readonly==0?'" ':'" readonly="readonly"')
			+'" size="6" />');

	if( obj.readonly!=0 ) $("#"+obj.id).addClass("readonly");

	// prevvalue property: backup of value to compare on changements.
	inputfield.prop("prevvalue", val);

	/* jQuery: .change fires if element lost focus. .input fires on every change. */
	inputfield.bind('input',
			function(event){
				if(check_doubleField(pnode.prop("json"), this.value)){
					//unset red property
					pnode.removeClass("red");
				}else{
					//mark element red
					pnode.addClass("red");
				}
			});
	//add event for element leave....
	inputfield.change( function(event){
		var o = pnode.prop("json");
		if(check_doubleField(o, this.value)){
			inputfield.prop("prevvalue", this.value);
			o.val = parse(o,this.value);
			//alert(this.value+"\n"+o.val);
			send_setting();
		}else{
			//reset value.
			this.value = inputfield.prop("prevvalue");
			pnode.removeClass("red");
		}
	});

	inputfield.hover( function(event){
		this.focus();
	},
	function(event){
		//this.blur();//unfocus element

		var o = pnode.prop("json");
		if( o.val != parse(o,this.value) ) inputfield.trigger('change');
	});

	inputfield.bind('mousewheel', function(event, delta) {

		var dir = delta>0?1:-1;
		var o = pnode.prop("json");
		if(o.readonly) return false;

		var prevVal = parse(o,this.value);
		var nextVal = Math.round( 100*(prevVal + dir*o.diff) )/100;

		//cut low and high values
		nextVal = o.min>nextVal ? o.min:((nextVal<o.max)?nextVal:o.max);

		var nextValStr = format(o,nextVal);

		//check if new value is valid.
		if(check_doubleField(o, nextValStr)){
			this.value = nextValStr;
		}

		return false;
	});

	inputfield.bind('keyup', function(event) {

		var o = pnode.prop("json");
		if(o.readonly) return false;

		var accel =0;
		switch( event.which ){
			case 37: /*Left key */
				accel =-1;
				break;
			case 39: /*Right key */
				accel =1;
				break;
			case 38: /*Up key */
				accel =10;
				break;
			case 40: /*Down key */
				accel =-10;
				break;
			case 33: /*PageUp key */
				accel =10000;
				break;
			case 34: /*PageDown key */
				accel =-10000;
				break;
			case 13: /* Enter */
				inputfield.blur();
				return false;
				break;
			default:
				return false;
				break;
		}

		var prevVal = parse(o,this.value);
		var nextVal = Math.round( 100*(prevVal + accel*o.diff) )/100;

		//cut low and high values
		nextVal = o.min>nextVal ? o.min:((nextVal<o.max)?nextVal:o.max);

		var nextValStr = format(o,nextVal);

		//check if new value is valid.
		if(check_doubleField(o, nextValStr)){
			this.value = nextValStr;
			//send updated values to server
			var o = pnode.prop("json");
			if( o.val != nextVal ) inputfield.trigger('change');
		}

		return false;
	});

	function gen_change_button_handler(speed, text, cssClass){
		button = $('<input type="button" value="'+text+'" />');
		button.addClass(cssClass);
		button.bind('click', 
				function(event) {

					var o = pnode.prop("json");
					if(o.readonly) return false;

					var prevVal = parse(o,inputfield.val());
					var nextVal = Math.round( 100*(prevVal + speed*o.diff) )/100;

					//cut low and high values
					nextVal = o.min>nextVal ? o.min:((nextVal<o.max)?nextVal:o.max);

					var nextValStr = format(o,nextVal);

					//check if new value is valid.
					if(check_doubleField(o, nextValStr)){
						inputfield.val(nextValStr);
						//send updated values to server
						var o = pnode.prop("json");
						if( o.val != nextVal ) inputfield.trigger('change');
					}
					return false;
				});
		return button;
	}

	m1 = gen_change_button_handler(-1, "---", "propBtn" );
	m2 = gen_change_button_handler(-0.1, "--", "propBtn" );
	m3 = gen_change_button_handler(-0.01, "-", "propBtn" );
	m4 = gen_change_button_handler( 0.01, "+", "propBtn" );
	m5 = gen_change_button_handler( 0.1, "++", "propBtn" );
	m6 = gen_change_button_handler( 1, "+++", "propBtn" );

	container = $('<div />');
	container.addClass('propContainer');

	container.prepend( m3 );
	container.prepend( m2 );
	container.prepend( m1 );
	ret.append( inputfield );
	container.append( ret );
	container.append( m4 );
	container.append( m5 );
	container.append( m6 );

	pnode.append( container );
}

function update_doubleField(obj){
	update_intField(obj);
}

function check_doubleField(o, val){
	var i = parse(o,val);

	//var i = parseFloat(val);
	if( ! isFinite(i) ) return false;
	if( i < o.min ) return false;
	if( i > o.max ) return false;
	return true;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

/* Simple label field */
function create_stateField(obj, pnode){
	var description = "Id: "+obj.id+" Val: "+format(obj,obj.val);
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	ret.addClass("json_input");

	//format value
	var val = format(obj,obj.val);
	var statefield = $('<span id="'+obj.id+'_">'+val+'</span>');
	statefield.prop("prevvalue", val);

	ret.append( statefield );
	pnode.append( ret );
}

function update_stateField(obj){
	var statefield = $("#"+obj.id+"_");
	var val = format(obj,obj.val);

	if( val == statefield.prop("prevvalue")) return;

	var statefield2 = $('<span id="'+obj.id+'_">'+val+'</span>');
	statefield2.prop("prevvalue", val);
	statefield.replaceWith(statefield2);
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++


function create_checkboxField(obj, pnode){
	var description = "Id: "+obj.id;
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	ret.addClass("json_input");

	var inputfield = $('<input type="checkbox" id="'+obj.id+'_" value="yes" />');
	inputfield.prop("checked",obj.val!=0);
	inputfield.prop("prevvalue", obj.val!=0 );

	//add toggle event
	inputfield.change( function(event){
		var o = pnode.prop("json");
		o.val = ( $(this).prop("checked")!=false?1:0 );
		send_setting();
	});

	ret.append( inputfield );
	pnode.append( ret );
}

function update_checkboxField(obj){
	var val = obj.val!=0;
	var checkbox = $("#"+obj.id+"_");
	var prev = checkbox.prop("prevvalue");
	if( val != prev && prev == checkbox.prop("checked") ){
		checkbox.prop("checked", obj.val!=0 );
		checkbox.prop("prevvalue", obj.val);
	}
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++

function create_messagesField(obj, pnode){
	var description = "Messages field. Refresh every second. Id: "+obj.id;
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	//ret.addClass("json_input");

	var field = $('<textarea id="'+obj.id+'_" rows="10" cols="35" >');
	field.prop("readonly",true);
	field.addClass("readonly");

	var messarr = new Array();
	field.prop("messarr",messarr);

	//insert messages
	$.each(obj.messages, function(index, value){
		//field.val(field.val()+value.line+" "+value.text+"\n");
		messarr.push( value.line+" "+value.text );
	});
	field.val( messarr.join("\n") );

	//scroll to bottom
	field.scrollTop(field.scrollHeight);

	ret.append( field );
	pnode.append( ret );
}

function update_messagesField(obj){
	var field = $("#"+obj.id+"_");

	var messarr = field.prop("messarr");
	var scrollPos = field[0].scrollTop;
	var onBottom = (scrollPos+field.height() + 30 > field[0].scrollHeight );

	$.each(obj.messages, function(index, value){
		//field.val(field.val()+value.line+" "+value.text+"\n");
		messarr.push( value.line+" "+value.text );
	});

	//remove old enties
	while( messarr.length > TEXTAREA_MAX_LINES ){
		messarr.shift(); //remove first entry
	}

	field.val( messarr.join("\n") );
	field.prop("messarr",messarr);
	if( onBottom ){
		//scroll to bottom
		field.scrollTop(field[0].scrollHeight);
	}else{
		//scroll to last known position. This is not perfect if old lines was removed.
		field.scrollTop(scrollPos);
	}
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++

function create_filesField(obj, pnode){
	var description = "List with all open files.";
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	//ret.addClass("json_input");
	pnode.append(ret);

	//loop throuth files-Array.
	for( var i in obj.filearray){
		var file = obj.filearray[i];
		var filespan = $("<div tite='"+file.filename+"' id='file_"+i+"'>");
		filespan.append( $("<h2>"+file.filename+" [<a href='javascript:unloadFile("+i+")'>X</a>]</h2>") );
		filespan.append( $("<p>"+file.description+"</p>") );
		ret.append(filespan);

		//create elements with the right ids.
		for( var j in file.html ){
			var prop = file.html[j];
			//mod id to get unique values. Removed and now set on server side
			//prop.id = "file"+i+"_"+prop.id;
			var propType = prop.id.substr( prop.id.indexOf("_")+1 );
			var text = TOKENS["props"][propType]["label"];
			var desc = TOKENS["props"][propType]["desc"];
			var propspan = $("<div id='"+prop.id+"' title='"+desc+"'>"+text+" </div>");
			propspan.addClass("prop");
			filespan.append(propspan);

		}
		open_files++;

		//fill new element nodes
		create_fields(file);

	}

}

function update_filesField(obj){

	if( open_files > obj.filearray.length){
		// the displayed number of files
		// excess number of open files.
	  // Clear displayed files and recreate.
		pnode = $('#files');
		pnode.empty();
		open_files = 0;
		create_filesField(obj, pnode)
	}

	//loop throuth files-Array.
	for( var i in obj.filearray){
		var file = obj.filearray[i];

		//fill new element nodes
		update_fields(file);
	}
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++

/*
 * Convert json_files into drop down list
 * unused
 * */
function create_jobFileList(){
	pnode = $("#fileBrowserList");

	var description = "List of job files. Edit the *.ini file to change the folder";
	var ret = $("<div title='"+description+"' alt='"+description+"'>");
	ret.addClass("json_input");

	var selectfield = $('<select id="fileBrowserListSelection" size="1">');
	selectfield.change( function(event){
		//alert($(this).val());
	});

	ret.append( selectfield );
	pnode.append( ret );

	filling_jobFileList( "fileBrowserListSelection" , json_job_files.content );
}

/*
 * unused
 * */
function filling_jobFileList( id, objArr ){
	selectfield =  $('#'+id);
	$('#'+id+" option").remove();
	if( objArr.length < 1 ){
		$("<option/>").val("-1").text("No files.").appendTo(selectfield);
	}else{
		for(var i=0; i<objArr.length; i++){
			$("<option/>").val(objArr[i][""+i+""]).text(objArr[i][i]).appendTo(selectfield);
		}
	}
}

/*
 * Update files list.
 * unused.
 * */
function update_jobFileList(){
	send("files","",
			function(data){
				json_job_files = JSON.parse(data);//change global var
				filling_jobFileList( "fileBrowserListSelection" , json_job_files.content );
			}
			);
}

/*
 * unused
 * */
function loadFile(button){

	var filename = $('#fileBrowserListSelection').val();
	var pnode = $('#files');

	//block load button
	$(button).prop("disabled",true);


	send("update?actionid=7","job_file="+filename,
			function(data){
				if( "failed" != data ){
					var job_files = JSON.parse(data);//local var.
					pnode.empty();
					create_filesField( job_files.html[0], pnode);
				}
				else alert("Loading of file failed.\nReturn value of server:\n"+data);
				$(button).prop("disabled",false);
			}
			);
}

//unused
function create_jobTimingStates(){
	/*
		 send("jobtimings","",
		 function(data){
		 var job_timings = JSON.parse(data);
		 create_fields(job_timings);
		 }
		 );
		*/
	//now already readed in job_timings.js
	create_fields(job_timings);
}


/*
 * unused 
 */
function unloadFile(fileindex){
	//its possible to load the same job twice.
	//thus, we do not use the filename to identify files.
	var ret = confirm("Remove file?");
	if( ret ){
		var pnode = $('#files');
		send("update?actionid=8","job_file_index="+fileindex,
				function(data){
					if( "failed" != data ){
						var job_files = JSON.parse(data);
						pnode.empty();
						create_filesField( job_files.html[0], pnode);
					}
				}
				);
	}
}


function loadConfig(){

	ok = !request_confirmation || confirm("Load Config File... Are you sure?");
	if( !ok ) return;
	
	var configFilename = $('#configFilename').val();
	send("update?actionid="+HTTP_ACTIONS["LOAD_CONFIG"],"configFilename="+configFilename,
			function(data){
				if( data == "ok" ) window.location.reload();
				else /*if( data == "error" )*/ alert("Loading failed");
			}
			);
}

function saveConfig(){
	var configFilename = $('#configFilename').val();
	send("update?actionid="+HTTP_ACTIONS["SAVE_CONFIG"],"configFilename="+configFilename,
			function(data){
				if( data == "error" ) alert("Saveing failed");
			}
			);
}

/*
 * unused
 */
function resetPrinter(){
	ok = !request_confirmation || confirm("Printing... Are you sure?");
	if( !ok ) return;

	sendCmd('R');
}

/**
 * Format functions.
 * Use functions with the name pattern "format_[style]" to convert
 * json values in strings.
 * Use functions with the name pattern "parse_[style]" to invert
 * the operation. Readonly values do not require parse functionality.
 * */
/*identities */
function format_(o,val){ return ""+val; }
function parse_(s){ p=parseFloat(s); return isNaN(p)?s:p; }

/* Use format_token to generate string */
function format_token(o,val){
	var arr = TOKENS[o.id];
	if( val in arr ) return arr[val];
	return "undefined";

}

/* format_state will be called for
 * job state string. Analyse this string
 * and update Print buttons. */
function format_state(o,val){
	state = format_token(o,val);

	if( val == last_state ){
		return state;
	}

	switch( state ){
		case "START_STATE":
//		case "INIT":
			$('#printButton').val("Print (Init)");
			break;
		case "PAUSE":
			$('#printButton').val("Resume");
			break;
		case "IDLE":
			request_confirmation = false;
			$('#printButton').val("Print");
			$('#openButton').prop("disabled",false);
			//$('#resetButton').prop("disabled",false);
			break;
		case "BREATH":
		case "CURING":
		case "OVERCURING":
		case "WAIT_ON_ZERO_HEIGHT":
			request_confirmation = true;
			$('#printButton').val("Pause");
			$('#openButton').prop("disabled",true);
			//$('#resetButton').prop("disabled",true);
			break;
	}

	return state;
}


function format_percent(o,val){
	var p = (typeof val === "string"?parseInt(val):val);
	if( p == -100 ) return "?%";
	return p+"%";
}

function parse_percent(o,s){
	if( s == "?%" ) return -100;
	return parseFloat(s);
}

/* millimeter, similar to percent. */
function format_mm(o,val){
	return format_mm2(o,val)+"mm";
}

/* without 'mm' */
function format_mm2(o,val){
	//var p = (typeof val === "string"?parseInt(val)*1000:val*1000);
	var p = (typeof val === "string"?parseInt(val)/1000:val/1000);
	var p = Math.round(p*100)/100;
	return p;
}

function parse_mm(s){
	//return parseFloat(s)/1000;
	return parseFloat(s)*1000;
}

/* Convert PU values into mm
 * 1PU = 0.00635mm = 6350 nm
 * xPU = x * (PU/mm) * mm = x * 635/1E5 * mm = x * 6350 * nm
 * */
function format_pu(o,val){
	var PU = 6350;//in nm
	var p = (typeof val === "string"?parseFloat(val)*PU:val*PU);
	p = Math.round(p/1000.0);//in μm
	return Math.round(p)/1000.0; //in mm.
}

/* Convert mm value into PU. */
function parse_pu(s){
	var PU = 6350;
	p = parseFloat(s)*1E6;//in nm
	return Math.round( p/PU );
}

/* Parse seconds into hh:mm:ss format */
function format_hhmmss(o,val){
	var p = (typeof val === "string"?parseInt(val):val);
	if( p < 0 ) return "00:00:00";
	s = p%60;
	p = Math.floor(p/60);
	m = p%60;
	h = Math.floor(p/60);
//	return sprintf("%2.0f:2.0f:2.0f", h,m,s);
 return (h<10?"0":"") + h + (m<10?":0":":") + m + (s<10?":0":":") + s;
}

/* Send current json struct to server and refresh displayed values.
*/
function send_setting(){
	send("update?actionid="+HTTP_ACTIONS["UPDATE_CONFIG"],"kinectSettings="+JSON.stringify(json_kinect), null);

	if(false)
		send("settings","",
				function(data){
					json_kinect = JSON.parse(data);//change global var
					update_fields(json_kinect);
				}
				);
}

/*
 * refresh settings */
function refresh(update){
	send("settings","",
			function(data){
				json_kinect = JSON.parse(data);//change global var
				if(update) update_fields(json_kinect);
				else create_fields(json_kinect);
			}
			);

	/*
		 send("messages","",
		 function(data){
		 json_messages = JSON.parse(data);//change global var
		 if(update) update_fields(json_messages);
		 else create_fields(json_messages);
		 }
		 );
	 */

	if( server_online ){
		window.clearTimeout(refreshTimeout);
		refreshTimeout = window.setTimeout("refresh2(true)", REFRESH_INTERVAL_MS);
	}else{
		window.clearTimeout(refreshTimeout);
		refreshTimeout = window.setTimeout("refresh2(true)", REFRESH_INTERVAL_MS_OFFLINE);
	}
}

/* like refresh, but this function checks the existance of a json struct
	 in the parent window and use this values if possible.
	 This reduce the loading calls of 'settings'.
 */
function refresh2(update){

	//Test
	if( !server_online ){
		// skip all automatic connection attempts till manual atction 
		// (i.e button pressing) fetch a file from the server.
		window.clearTimeout(refreshTimeout);
		refreshTimeout = window.setTimeout("refresh2(true)", REFRESH_INTERVAL_MS_OFFLINE);
		return;
	}

	if( window.opener !== null && !window.opener.closed &&
			typeof(window.opener.json_kinect) === "object" ){
		json_kinect = window.opener.json_kinect;
		if(update) update_fields(json_kinect);
		else create_fields(json_kinect);

		window.clearTimeout(refreshTimeout);
		if( server_online ){
			refreshTimeout = window.setTimeout("refresh2(true)", REFRESH_INTERVAL_MS);
		}else{
			refreshTimeout = window.setTimeout("refresh2(true)", REFRESH_INTERVAL_MS_OFFLINE);
		}
	}else{
		refresh(update);
	}
}

//send complete json struct
function send(url,val, handler){
	//Add space to avoid empty second arg!
	if(val == "") val = " ";
	$.post(url, val, function(data){
			//alert("Get reply\n"+data);
			server_online = true;
			if( data == "reload" ){
			//alert("Reload Page");
			window.location.reload();
			}else{
			//reparse data
			if( handler != null ) handler(data);
			}
			}).fail(function (xhr, textStatus, errorThrown){
				// catch net::ERR_CONNECTION_REFUSED. The cpu usage increases
				// permanently if the script opens a big number of connections.
				server_online = false;
				});
	return true;
}


/*
 * unused
 */
function toggleDisplay(button){

	ok = !request_confirmation || confirm("Printing... Are you sure?");
	if( !ok ) return;

	/* With post arg display=0: display off.
	 * With post arg display=1: display on.
	 * With post arg display=2: display toggle.
	 * Without post arg: Just get value.
	 * Return value data: display status (0|1).
	 * */
	send("update?actionid=5","display=2",
			function(data){
				if( data == 1 ){
					button.value = "Hide Display"
				}else{
					button.value = "Show Display"
				}
			}
			);
}

function areaDetection(i){
	send("update?actionid="+HTTP_ACTIONS["SET_AREA_DETECTION"],"start="+i);
	forceImageUpdate = true;
	if( i == 1)
		$("#info").empty().append("Click into image to select area.");
}

function repoke(){
	send("update?actionid="+HTTP_ACTIONS["REPOKE"],"");
	forceImageUpdate = true;
}

function manual_mask_generation(){
	send("update?actionid="+HTTP_ACTIONS["REGENERATE_MASKS"],"");
}


function setView(i){
	send("update?actionid="+HTTP_ACTIONS["SELECT_VIEW"],"view="+i);
	forceImageUpdate = true;
}

function saveMasks(){
	send("update?actionid="+HTTP_ACTIONS["SAVE_MASKS"],"");
}

function loadMasks(){
	send("update?actionid="+HTTP_ACTIONS["LOAD_MASKS"],"");
}


function quit(){
	ok = !request_confirmation || confirm("Quit KinectGrid?");
	if( ok ){
		window.clearTimeout(refreshTimeout);
		server_online = false;
		send("update?actionid="+HTTP_ACTIONS["QUIT_PROGRAM"],"");
		refreshTimeout = window.setTimeout("refresh2(true)", REFRESH_INTERVAL_MS_OFFLINE);
	}
}

function resetConfig(){
	ok = !request_confirmation || confirm("Reset Values... Are you sure?");
	if( !ok ) return;

	send("update?actionid="+HTTP_ACTIONS["RESET_CONFIG"],"");
	forceImageUpdate = true;
}

/* Send serial command */
/*
 * unused
 */
function sendCmd(str){
	send("update?actionid=4","cmd="+str,null);
}

function format(o,val){
	if( typeof window["format_"+o.format] === "function" )
		return (window["format_"+o.format])(o,val);
	return val;
}

function parse(o,s){
	if( typeof window["parse_"+o.parse] === "function" ){
		return (window["parse_"+o.parse])(s);
	}
	return s;
}




//modifiy children of html node (no rekursion implemented)
function modifyJson(id,val){
	$.each(	json_kinect.html, function(index,v){
		if(v.id==id){ v.val=val; }
	});
}


function deepCopy(p,c) {
	var c = c||{}; for (var i in p) {
		if (typeof p[i] === 'object') {
			c[i] = (p[i].constructor === Array)?[]:{};
			deepCopy(p[i],c[i]);
		} else c[i] = p[i];
	}
	return c;
}


function openWindow(url){
	var w = window.open('index2.html');
}

/*
 * Area detection. Return true if area detection mode is active.
 */
AREA_DETECTION_MODES = [
TOKENS["modeState"].indexOf("AREA_DETECTION"),
TOKENS["modeState"].indexOf("AREA_DETECTION_START"),
TOKENS["modeState"].indexOf("AREA_DETECTION_END"),
];
function isAreaDetectionMode(){
	return ( -1 < AREA_DETECTION_MODES.indexOf(json_kinect.mode) );
}

/*
 * Area detection.
 * Detect pixel coordinates on preview image and send them
 * to the server. 
 */
function areaDetection_sendCoordinates(x,y){
	x = parseInt(x);
	y = parseInt(y);
	send("update?actionid="+HTTP_ACTIONS["AREA_DETECTION_CLICK"]+"&x="+x+"&y="+y,"",
			function(data){
			data = parseInt(data)
			if( isNaN(data) ) data = -4;
			if( data == -4 ){
			$("#info").empty().append("Unknown return value.");
			}
			if( data == -3 ){
			$("#info").empty().append("Server not in area detection mode.");
			}
			if( data == -2 ){
			$("#info").empty().append("Input parsing failed.");
			}
			if( data == -1 ){
			$("#info").empty().append("No area found.");
			}
			if( data == 0 ){
			$("#info").empty().append("Area detection finished.");
			}
			if( data > 0 ){
			$("#info").empty().append("Area "+data+" added. Click on area 1 to finish detection.");
			setTimeout( function() { reloadImage(true); }, 1000); 
			}
			}
	);
}

