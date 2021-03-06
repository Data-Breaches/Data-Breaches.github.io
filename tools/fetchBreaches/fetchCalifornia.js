const {
  exec
} = require("child_process");
var fs = require('fs');
const request = require('request');
const {
  JSDOM
} = require("jsdom");
const {
  window
} = new JSDOM("");
const $ = require("jquery")(window);

var sources = {
  'CA': {
    name: "California",
    domain: "https://oag.ca.gov/",
    url: "https://oag.ca.gov/privacy/databreach/list",
    items: [],
    index: 0,
    handler: getCalifornia
  },
}

const orgEventsSeparator = '<p class="hidden"></p>\n'
const numberMonths = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December'
}

const monthsArray = [null, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const shortMonths = {
  'Jan': 'January',
  'Feb': 'February',
  'Mar': 'March',
  'Apr': 'April',
  'May': 'May',
  'Jun': 'June',
  'Jul': 'July',
  'Aug': 'August',
  'Sep': 'September',
  'Oct': 'October',
  'Nov': 'November',
  'Dec': 'December'
}

var allOrganizations = {
/*
	'Org': {dateValue: true/flase}
*/
}

var allRecords = {
/*
  '1': {
		recordsByName : {},  
		allDates : []
  },
*/
}

var allSections = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function initializeAllRecords() {
	for(var i=0; i<allSections.length; i++) {
		allRecords[allSections.charAt(i)] = {};
		allRecords[allSections.charAt(i)].recordsByDate = {};
		allRecords[allSections.charAt(i)].allDates = [];
	}		
}

function sortARecord(record) {
	console.log(record);
	var initial = record.name.charAt(0).toUpperCase();
	var section = allRecords[initial];
	if(section === undefined) {
		return;
	}
	var dateValue;
	if(record.date.startsWith('n/a')) {
		dateValue = 0;
	} else {
		var date = new Date(record.date);
		dateValue = date.getTime();
	}
	if(Number.isNaN(dateValue)) {
		dateValue = 0;
	}
	console.log(dateValue);
			
	function registerOrgAndDate() {
/* return former top date if any, otherwise null */
		if(allOrganizations[record.name] === undefined) {
			allOrganizations[record.name] = {};
			allOrganizations[record.name][dateValue] = true;
			return null;	
		} else {
			var orgRecord = allOrganizations[record.name];
			/* Find the former top date */
			var dates = Object.keys(orgRecord);
			var top = dates[0];
			for(var i=1; i< dates.length; i++) {
				if(dates[i] > top) {
					top = dates[i];
				}
			}
			if(orgRecord[dateValue] === undefined) {
				orgRecord[dateValue] = true;
			} 
			return top;
		}
	}
			
	var formerTopDate = registerOrgAndDate();
	if(formerTopDate) {
		var thisDate = section.recordsByDate[formerTopDate];
		var thisOrg = thisDate[record.name];
		if(formerTopDate !== dateValue) {
			thisOrg[dateValue] = record;
			if(dateValue > formerTopDate) {
   			if(section.recordsByDate[dateValue] === undefined) {
     			section.recordsByDate[dateValue] = {};
     			var thisDateSection = section.recordsByDate[dateValue];
     			thisDateSection[record.name] = thisOrg;
     			/* Insert new date in allDates */ 
     			if(section.allDates.length === 0) {
       			section.allDates = [dateValue];
     			} else {
       			var i;
       			for(i=0; i< section.allDates.length; i ++) {
         			if(dateValue > section.allDates[i]) {
           			break;
         			}
       			}
       			section.allDates.splice(i, 0, dateValue);
     			}
   			} else {
					var thisDateSection = section.recordsByDate[dateValue];
					thisDateSection[record.name] = thisOrg;
      	}						
				var thisDateSection = section.recordsByDate[formerTopDate];
				delete thisDateSection[record.name]
			}
		} 
	} else {
		if(section.recordsByDate[dateValue] === undefined) {
      section.recordsByDate[dateValue] = {};
      var thisDateSection = section.recordsByDate[dateValue];
      thisDateSection[record.name] = {};
			var thisOrg = thisDateSection[record.name];
			thisOrg[dateValue] = record;
      /* Insert new date in allDates */
      if(section.allDates.length === 0) {
        section.allDates = [dateValue];
      } else {
        var i;
      	for(i=0; i< section.allDates.length; i ++) {
        	if(dateValue > section.allDates[i]) {
          	break;
        	}
      	}
      	section.allDates.splice(i, 0, dateValue);
    	}
		} else {
   		var thisDateSection = section.recordsByDate[dateValue];
    	thisDateSection[record.name] = {};
			var thisOrg = thisDateSection[record.name];
    	thisOrg[dateValue] = record;
		}
	}
}

/* Build initial records from index.md */
function buildInitialRecords() {
	initializeAllRecords();
/* Copy index.md to local folder*/
  exec('cp ../../index.md .', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log("Copied index.md");
    setTimeout(readOriginalFile, 100);
  });

/* Read local index.md */
	function readOriginalFile() {
		var content = fs.readFileSync('index.md', 'utf8');
		var orgBlocks = content.split("##");		

		function parseABlock(block) {
			var record = {};
			var BM = block.indexOf('[');
			var EM = block.indexOf(']');
			if((BM !== -1) && (EM !== -1)) {
				var date = block.substring(BM + 1, EM); 
				console.log(date);
				if(!date.startsWith('n/a') && (date.indexOf('/') !== -1)) {
					var parts = date.split('/');
					var month = monthsArray[parseInt(parts[0])];
					record.date = month + parts[1] +', ' + parts[2];
				} else {
					record.date = date.trim();
				} 
			}  else {
				return NULL;
			}
			block = block.substring(EM+1);
			var BM = block.indexOf('(');
      var EM = block.indexOf(')');
      if((BM !== -1) && (EM !== -1)) {
        var url = block.substring(BM + 1, EM);        
        console.log(url);
        record.url = url;
      }  else {
        return NULL;
      }
			block = block.substring(EM+1);
			var BM = block.indexOf('|');
      var EM = block.indexOf('\n');
      if((BM !== -1) && (EM !== -1)) {
        var cause = block.substring(BM + 1, EM);
        console.log(cause);
        record.cause = cause.trim();
      }  else {
        return NULL;
      }
			var BM = block.indexOf('</summary>');
      var EM = block.indexOf('</details>');
      if((BM !== -1) && (EM !== -1)) {
        var abstract = block.substring(BM + 11, EM);
        console.log(abstract);
        record.abstract = abstract.trim();
      }  else {
        return NULL;
      }			
	
			return record;
		}

		function parseAnOrgBlock(thisOrg) {
			var blocks = thisOrg.split(orgEventsSeparator);
			var name = blocks[0];
			name = name.split('\n')[0].trim();
			for(var i=1; i<blocks.length; i++) {
				var record = parseABlock(blocks[i]);
				record.name = name;
				console.log(record);
				sortARecord(record);
			}	
		}
		
		for(var i=1; i<orgBlocks.length; i++) {
			parseAnOrgBlock(orgBlocks[i])
		}
		//console.log(allRecords);
		setTimeout(fetchRecords, 100);	
		//setTimeout(publish, 100);
	}
}

buildInitialRecords();

function getContent(url, fn) {
	console.log("getContent: ", url);
  request(url, function(error, response, body) {
    if (error) {
      console.error('error:', error); // Print the error if one occurred
      fn(error, null);
      return;
    }
    if (response && response.statusCode) {
      console.log('statusCode:', response.statusCode);
      if (response.statusCode === 200) {
        fn(null, body);
      }
    } else {
      console.log("Invalid response");
      fn("Invalid response", null);
    }
  });
}


function publish() {
	var content = fs.readFileSync('index_header.md', 'utf8');
	fs.writeFileSync('new_index.md', content);

	for(var i=0; i<allSections.length; i++) {
		var sectionId = allSections.charAt(i);
		
		var thisSection = allRecords[sectionId];
		var allDates = thisSection.allDates;
		if(allDates.length) {
    	fs.appendFileSync('new_index.md', '# ' +  sectionId + '\n');  
    }	

		publishSection(thisSection);
	}

	function publishSection(thisSection) {
		var allDates = thisSection.allDates;
		for(var i=0; i<allDates.length; i++){
			var thisDate = thisSection.recordsByDate[allDates[i]];
			//fs.appendFileSync('new_index.md', '## ' + allDates[i] + '\n');
			publishDate(thisDate);
		}
	}

	function publishDate(thisDate) {
		var allOrgs = Object.keys(thisDate);
		for(var i=0; i< allOrgs.length; i++) {
			fs.appendFileSync('new_index.md', '## ' + allOrgs[i] + '\n');
			thisOrg = thisDate[allOrgs[i]];
			publishOrg(thisOrg);
		}
	}

	function publishOrg(thisOrg) {
		var allEvents = Object.keys(thisOrg);
		allEvents.sort();
		for(var i=allEvents.length -1; i>-1; i--) {
			// fs.appendFileSync('new_index.md', '### ' + allEvents[i] + '\n');
			fs.appendFileSync('new_index.md', orgEventsSeparator);
			var dateAndCause = '[' + thisOrg[allEvents[i]].date + '](' + thisOrg[allEvents[i]].url + ') | ' + thisOrg[allEvents[i]].cause + '\n' 
			fs.appendFileSync('new_index.md', dateAndCause);
			//fs.appendFileSync('new_index.md', thisOrg[allEvents[i]].date + '\n');
			//fs.appendFileSync('new_index.md', thisOrg[allEvents[i]].cause + '\n');
			//fs.appendFileSync('new_index.md', thisOrg[allEvents[i]].url + '\n');
			var abstract = '{: .fs-4 .fw-700 .lh-0  }\n<details>\n  <summary>Abstract</summary>\n' + thisOrg[allEvents[i]].abstract + '\n' + '</details>\n';
			fs.appendFileSync('new_index.md', abstract);
			//fs.appendFileSync('new_index.md', thisOrg[allEvents[i]].abstract + '\n');
		}
	}
}

function fetchRecords() {
	getItemsFromSource('CA', function(err) {
		if(err) {

		} else {
			setTimeout(publish, 100);
		}	
	});
}

function getItemsFromSource(id, fn) {
	getContent(sources[id].url, function(err, data) {
    if (err) {
      fn(err);
      return;
    } else {
			//console.log(data);
			var $content = $($.parseHTML(data));
			sources[id].handler($content, function(err, items) {
				fn(null);
			});
			return;
		}	
	})
}

function getCalifornia($content, fn) {
	var items = [];
	var $container = $content.find('.views-table');

	if($container.length) {
		var $list = $container.find('tr');

    for (var i = 1; i < $list.length; i++) {
      var thisItem = {};
      var $thisItem = $list.eq(i);
      thisItem.name = $.trim($thisItem.find('.views-field-field-sb24-org-name').find('a').text());
      thisItem.url = $thisItem.find('.views-field-field-sb24-org-name').find('a').attr('href');
      var dateStr = $thisItem.find('.views-field-field-sb24-breach-date').find('span').eq(0).text();
    	dateStr = dateStr.trim(); 
			if(!dateStr.startsWith('n/a') && (dateStr.indexOf('/') !== -1)) {
        var parts = dateStr.split('/');
        var month = monthsArray[parseInt(parts[0])];
        dateStr = month + ' ' +  parts[1] +', ' + parts[2];
      } 

			thisItem.date = dateStr;
			items.push(thisItem)  
    }

    var index = 0;
    function getArticle() {
      if(index < items.length) {
				/* Check if a record exists or not for the item*/
				var orgName = items[index].name;

				if(allOrganizations[orgName] !== undefined)	{
					var date = new Date(items[index].date);
					var dateValue = date.getTime();
					var org = allOrganizations[orgName];
				  if(org[dateValue] !== undefined) {
						index ++;
						setTimeout(getArticle, 100);
						return;	
					}	
				}
        getContent(items[index].url, function(err, data) {
          if (err) {
            index ++;
            setTimeout(getArticle, 100);
          } else {
            //console.log(data);
            var $article = $($.parseHTML(data));
						var fileUrl = $article.find('.file').find('a').attr('href');
						items[index].url = fileUrl;
						items[index].abstract = "TBD";
						items[index].cause = "CAUSE";
						sortARecord(items[index]);						
            index ++;
            setTimeout(getArticle, 100);
          }
        });
      } else {
        fn(null, items);
      }
    }
    getArticle()

		console.log("Done.");
	}

	fn(null);
}

