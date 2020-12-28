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

var allOrganizations = {
/*
	'Org': {dateValue: true/flase}
*/
}

var allRecords = {
/*
  '1': {
		recordsByDate : {},  // 'Date': [{name: <>, url: <>, abstract:<>, casue:<>}]
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
    setTimeout(readOriginalFile, 500);
  });

/* Read local index.md */
	function readOriginalFile() {
		var content = fs.readFileSync('index.md', 'utf8');
		var blocks = content.split("##");		

		function parseABlock(block) {
			var record = {};
			var BM = block.indexOf('[');
			var EM = block.indexOf(']');
			if((BM !== -1) && (EM !== -1)) {
				var name = block.substring(BM + 1, EM); 
				console.log(name);
				record.name = name;
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
			var BM = block.indexOf(')');
      var EM = block.indexOf('\n');
      if((BM !== -1) && (EM !== -1)) {
        var extraName = block.substring(BM + 1, EM);
				if(extraName.length) {
        	console.log(extraName);
				}
        record.name += extraName;
				record.name = record.name.trim();
      }  else {
        return NULL;
      }
			var BM = block.indexOf('\n');
      var EM = block.indexOf('|');
      if((BM !== -1) && (EM !== -1)) {
        var date = block.substring(BM + 1, EM);
        console.log(date);
        record.date = date.trim();
      }  else {
        return NULL;
      } 
			var BM = block.indexOf('|');
      var EM = block.indexOf('<br>');
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

		function sortARecord(record) {
			var initial = record.name.charAt(0);
			var section = allRecords[initial];

			var date = new Date(record.date);
			var dateValue = date.getTime();
			console.log(dateValue);
			
			function registerOrgAndDate() {
				if(allOrganizations[record.name] === undefined) {
					allOrganizations[record.name] = {};
					allOrganizations[record.name][dateValue] = true;	
				} else {
					var orgRecord = allOrganizations[record.name];
					if(orgRecord[dateValue] === undefined) {
						orgRecord[dateValue] = true;
					} else {
					}
				}
			}
			
			registerOrgAndDate();

			if(section.recordsByDate[dateValue] === undefined) {
				section.recordsByDate[dateValue] = [record];
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
				section.recordsByDate[dateValue].push(record);
			}
		}

		for(var i=1; i<blocks.length; i++) {
			var record = parseABlock(blocks[i]);
			console.log(record);

			sortARecord(record);
		}
		//console.log(allRecords);
		setTimeout(fetchRecords, 100);	
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

function fetchRecords() {
	getItemsFromSource('CA', function(err) {

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
			sources[id].handler($content, function(err, newsList) {
				var $content = $($.parseHTML(data));
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
			thisItem.date = dateStr;
			items.push(thisItem)  
    }

		console.log("Done.");
	}

	fn(null);
}

