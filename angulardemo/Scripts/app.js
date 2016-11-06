//global array to hold querystring data parameters
var _dataparams = [];

//function to extract the encoded parameters from the "data" parameter in the querystring
function parseDataParams(){
	if (location.search != "") {
		var splitqs = location.search.substr(1).split("&");
		for (var j=0;j<splitqs.length;j++) {
			var kvp = splitqs[j].replace(/\+/g, " ").split("=");
			if(kvp[0].toUpperCase()=="DATA") {
				if (kvp[1] != "") {
					var rawdatakvps = decodeURIComponent(kvp[1]).split("&");
					for (var i=0;i<rawdatakvps.length;i++) {
						_dataparams[i] = rawdatakvps[i].replace(/\+/g, " ").split("=");
					}
				}
				break;
			}
		}
	}
}

//function to return a parameter value by name from the global _dataparams array
function getParamVal(paramname){
	for(var i=0;i<_dataparams.length;i++){
		if(paramname.toUpperCase()==_dataparams[i][0].toUpperCase()){
			return _dataparams[i][1];
		}
	}
}

//function to remove the { and } from the main record's guid
function getPlainObjectId(){
    return getParamVal('objectid').replace('}','').replace('{','');
}

angular.module('crmEditorApp', []).controller('CrmEditorController', function($scope) {
    var crmEditor = this;
    
    //object that represents the "main" record
    crmEditor.mainrecord = {name:"",description:""};

    //array of related tasks
    crmEditor.tasks = [];

    //function to retrieve the main record - called onload
    crmEditor.RetrieveRecord = function(){
        //set the web api query parameters
        var recorduri = "/la_demoparents" + "(" + getPlainObjectId() + ")"; 
        var recordselect = ['la_name_text','la_description_text'].join();
        var recordquery = recorduri + "?$select=" + recordselect;

        //execute web api query and process results
        Sdk.request("GET", recordquery, null, true, 5000).then(function (request) {
            //parse the response
            var response = JSON.parse(request.response);

            //set the mainrecord object values
            crmEditor.mainrecord.name = response["la_name_text"];
            crmEditor.mainrecord.description = response["la_description_text"];

            //call $scope.$apply() to update displayed data 
            $scope.$apply();
        })
        .catch(function (error) {
            console.log(error.message);
        });
    }

    //function to retrieve tasks related to the main record - called onload and after a new task is created
    crmEditor.RetrieveTasks = function(){
        //clear the tasks array so we don't get duplicates displayed if this is not the first time the function is called
        crmEditor.tasks = [];

        //set the web api query parameters
        var recorduri = "/tasks"; 
        var recordselect = ['subject','description','scheduledstart','scheduledend'].join();
        var recordfilter = '_regardingobjectid_value eq ' + getPlainObjectId();
        var recordquery = recorduri + "?$select=" + recordselect + "&$filter=" + recordfilter;

        //execute web api query and process results
        Sdk.request("GET", recordquery, null, true, 5000).then(function (request) {
            //parse the response
            var collection = JSON.parse(request.response).value;
            collection.forEach(function (row, i) {
                //create an object to represent the task
                var taskobject = {};
                taskobject.subject = row["subject"];
                taskobject.description = row["description"];
                if(row["scheduledstart"]){
                    taskobject.scheduledstart = new Date(row["scheduledstart"]);
                }

                if(row["scheduledend"]){
                    taskobject.scheduledend = new Date(row["scheduledend"]);
                }

                //add the object to the tasks array
                crmEditor.tasks.push(taskobject);
            });

            //call $scope.$apply() to update displayed data 
            $scope.$apply();
        })
        .catch(function (error) {
            console.log(error.message);
        });
    }

    //function to update the main record
    crmEditor.UpdateRecord = function(){
        //set the web api query parameters
        var recorduri = "/la_demoparents" + "(" + getPlainObjectId() + ")"; 

        //create an object to send to web api for update via PATCH operation
        var crmrecord = {};
        crmrecord.la_name_text = crmEditor.mainrecord.name;
        crmrecord.la_description_text = crmEditor.mainrecord.description;

        //make the PATCH request
        return Sdk.request("PATCH", recorduri, crmrecord)
        .then(function(request){
            //call $scope.$apply() to update displayed data 
            $scope.$apply();
        })
        .catch(function (error) {
            console.log(error.message);
        });
    }

    //function to add a new related task
    crmEditor.AddTask = function(){
        //set the web api query parameters
        var recorduri = "/tasks"; 

        //create an object to send to web api for create via POST operation
        var crmrecord = {};
        crmrecord.subject = $scope.tasksubject;
        crmrecord.description = $scope.taskdescription;
        crmrecord.scheduledstart = new Date($scope.taskdue);
        crmrecord.scheduledend = new Date($scope.taskdue);

        //note you can't set the regardingobjectid value directly - must use navigation property
        crmrecord["regardingobjectid_la_demoparent_task@odata.bind"] = "/la_demoparents("+getPlainObjectId()+")";

        //make the POST request
        return Sdk.request("POST", recorduri, crmrecord)
        .then(function(request){
            //clear the task fields
            $scope.tasksubject = null;
            $scope.taskdescription = null;
            $scope.taskdue = null;

            //retrieve the tasks from crm again so we get the newly created task
            crmEditor.RetrieveTasks();
        })
        .catch(function (error) {
            console.log(error.message);
        });
    }

    //parse the querystring to get the objectid in the data parameter
    parseDataParams();

    //retrieve the main record
    crmEditor.RetrieveRecord();

    //retrieve the related tasks
    crmEditor.RetrieveTasks();
});