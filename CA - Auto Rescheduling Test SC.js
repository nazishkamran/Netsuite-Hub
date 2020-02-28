/*
* Script Name : CA - Auto Rescheduling Test SC 
* Script Type : Scheduled
* Description : 
* Company     : CloudAlp.
*/

var SPARAM_AUTO_RESCHEDULE_SS_ID='custscript_auto_reschedule_ss_id';
var SPARAM_INDEX='custscript_ca_auto_reschedule_index';

function autoRescheduled(type){
	
	var context = nlapiGetContext();
	var ssID = context.getSetting('SCRIPT', SPARAM_AUTO_RESCHEDULE_SS_ID);
	var index = context.getSetting('SCRIPT', SPARAM_INDEX);
	if(index == null || index == '')
		index = 0;
	var mainObj={};
	if(ssID!=null && ssID!='')
    {
		var loadSS=nlapiLoadSearch(null, ssID);
    	var filters = loadSS.getFilters();
		var columns=loadSS.getColumns();
	 	var ssType = loadSS.getSearchType();
	 	var searchResults=getAllSearchResults(ssType, filters, columns);
		if (searchResults != null && searchResults != '') {
			for(var s = 0; s < searchResults.length; s++) {
				try{
				var result = searchResults[s];
				var internalid = result.getId();
				var recordType = result.getRecordType()

				if(!mainObj.hasOwnProperty(internalid))
				 {
					 mainObj[internalid] = [];
				     
		 
	             }
				 
					mainObj[internalid].push(recordType);
					
				}catch(e){
					if ( e instanceof nlobjError )
						nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
					else
						nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
				}
				
				
			}
			
			nlapiLogExecution('DEBUG','mainObj',JSON.stringify(mainObj));
			 var contents = '';
			  if(mainObj != null && mainObj != '')
		      {
			      for(var prop in mainObj)
			      { 
			    	
			    	  contents = contents + prop + '__';
			    	  var recordType=mainObj[prop];  
					 for(var j=0; j<recordType.length; j++)
					 {
						 contents +=  recordType[j] + '|' ;
					 }
					 contents = contents.slice(0, -1)+ '\n';

			      }
					 nlapiLogExecution('debug','contents',contents);

		      }
			  if(contents != null && contents != '')
			     {
				     var timeStamp = new Date().getTime();
				     var file = nlapiCreateFile('transaction_'+timeStamp+'.csv', 'CSV', contents)
			      	 file.setFolder('15767');
			      	 fileID = nlapiSubmitFile(file);
				     nlapiLogExecution('debug','fileID',fileID);
			     }
		}
	 	
	 	
    }
	
	if(fileID != null && fileID != '')
	  {
		var fileProcessed=true;
		var allData = nlapiLoadFile(fileID);
		var fileValue = allData.getValue();
		if(fileValue != null && fileValue != ''){
		var fileRows = fileValue.split('\n');
		if(fileRows != null && fileRows != ''){
		  for(var f=0; f<(fileRows.length-1); f++){
				index++;
		  if (fileRows[f] != null && fileRows[f] != ''){
				var eachLine = fileRows[f];
				if(eachLine != null && eachLine != ''){
					var lines = eachLine.split('__');
					var soID = lines[0];
					var type = lines[1];
				  
				 	if(index <= 7)
						{
						nlapiSubmitField(type, soID, 'memo', 'Test Auto Rescheduling 1.0');
						}
						else
						{
						nlapiSubmitField(type, soID, 'memo', 'Test Auto Rescheduling 2.0');	
						}  
				     
				}

					
		}
		  if((index != 0) && (index % 7) == 0) { 
		  fileProcessed=false;
          setRecoveryPoint(); 
          checkGovernance();
      } 
		
		  }

	   }
	  }
		
		if(fileProcessed)
		nlapiDeleteFile(fileID);
	  }
	
	
}

function setRecoveryPoint() {
    var state = nlapiSetRecoveryPoint(); 
    
    if(state.status == 'SUCCESS')
        return;  
    if(state.status == 'RESUME') {
        nlapiLogExecution('DEBUG', 'setRecoveryPoint', 'Resuming script because of ' + state.reason + '.  Size = ' + state.size);
        handleScriptRecovery();
    } else if (state.status == 'FAILURE') {  
        nlapiLogExecution('DEBUG', 'setRecoveryPoint', 'Failed to create recovery point. Reason = ' + state.reason + ' / Size = ' + state.size);        
    }
}

function checkGovernance() {
    var context = nlapiGetContext();
    
    if(context.getRemainingUsage() < 10000) {
        var state = nlapiYieldScript();
        if(state.status == 'FAILURE') {
            nlapiLogExecution('DEBUG', 'checkGovernance', 'Failed to yield script, exiting: Reason = ' + state.reason + ' / Size = ' + state.size);
            throw 'Failed to yield script';
        } else if (state.status == 'RESUME') {
            nlapiLogExecution('DEBUG', 'checkGovernance', 'Resuming script because of ' + state.reason + '.  Size = ' + state.size);
        }
    }
}




//function calling
//var searchres_morethan1000 = getAllSearchResults(record_type, filters, columns);
//function definations
function getAllSearchResults(record_type, filters, columns)
		{
			var search = nlapiCreateSearch(record_type, filters, columns);
			search.setIsPublic(true);

			var searchRan = search.runSearch()
			,	bolStop = false
			,	intMaxReg = 1000
			,	intMinReg = 0
			,	result = [];

			while (!bolStop && nlapiGetContext().getRemainingUsage() > 10)
			{
				// First loop get 1000 rows (from 0 to 1000), the second loop starts at 1001 to 2000 gets another 1000 rows and the same for the next loops
				var extras = searchRan.getResults(intMinReg, intMaxReg);

				result = searchUnion(result, extras);
				intMinReg = intMaxReg;
				intMaxReg += 1000;
				// If the execution reach the the last result set stop the execution
				if (extras.length < 1000)
				{
					bolStop = true;
				}
			}

			return result;
		}
		
		 function searchUnion(target, array)
		{
			return target.concat(array); // TODO: use _.union
		}
