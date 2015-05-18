//Object Handling Utils
function is_object(mixed_var) {
  if (Object.prototype.toString.call(mixed_var) === '[object Array]') {
    return false;
  }
  return mixed_var !== null && typeof mixed_var == 'object';
}

function merge(a, b, operator) {

  var cache = {};
  cache = unpackObject(a, cache, operator);
  cache = unpackObject(b, cache, operator);

  return cache;
}

function unpackObject(a, cache, operator) {
  for (prop in a) {
    if (a.hasOwnProperty(prop)) {
      if (cache[prop] === undefined) {
        cache[prop] = a[prop];
      } else {
        if (typeof cache[prop] === typeof a[prop]) {
          if (is_object(a[prop])) {
            cache[prop] = merge(cache[prop], a[prop]);
          } else {
            eval('cache[prop] ' + operator + '= a[prop]');
          }
        }
      }
    }
  }
  return cache;
}

//InfluxDb Utils
function getInfluxDbData(query, datasource, settings){

  var username    = settings.datasources[datasource].username;
  var password    = settings.datasources[datasource].password;
  var url         = settings.datasources[datasource].url;

  var getUrl      = url + '/series?q=' + query + '&u=' + username + '&p=' + password;
  var result;

  $.ajax({

    url: getUrl,
    async: false,  
    success: function (data) {
      result = arrangeInfluxDbData(data);
    }
  });

  return result;
}

function arrangeInfluxDbData(data) {

  data = data[0];

  if (data && data['points'] !== undefined && data['columns'] !== undefined) {
    points   = data['points'];
    columns  = data['columns'];

    result = _.map(points, function(value, key){
      var obj = {};

      for (var i = 0; i < value.length; i++){
        obj[columns[i]] = value[i];
      }

      return obj;
    });

    return result;
  }
  else return [];
}

function groupByKey(array, key){

  // [] or {} ??? To think
  var obj = {};

  if (array !== undefined) {
    for (var i = 0; i < array.length; i++){

      var point     = array[i];
      var value     = point[key];
      obj[value]    = point;
    }    
  }

  return obj;

}

function createQuery(table, select, where, groupBy, orderBy){

  var query = "select ";

  query += select ? select + " " : "* ";
  query += " from " + table + " ";

  // If query has conditions a where clause is built
  if (where.length > 0) {
    query += " where ";
    for (var i = 0; i < where.length; i++) {
      query += i == 0 ? where[i] + " " : "and " + where[i] + " ";
    }
  }
  if (groupBy) query += " group by " + groupBy;
  if (orderBy) query += " order "    + orderBy;

  return query;

}

//groups data by an array of timestamps
function groupByTime(dates, data, key){

  var obj       = {};
  var dataIndex = 0;

  for (var i = 0; i < dates.length; i++){
    var d = [];
    startDate = dates[i].date;
    endDate   = i == dates.length - 1 ? new Date() : dates[i+1].date;

    while (dataIndex < data.length && new Date(data[dataIndex].time) < endDate){
      if (new Date(data[dataIndex].time) < startDate) {
        dataIndex++;
        continue;
      }

      var value = data[dataIndex][key];
      if (d.indexOf(value) == -1) d.push(value);
      dataIndex++;
    }

    obj[dates[i].str] = d;
  }

  return obj;

}

//Datetime Utils
function getMonday(d) {

  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
  return new Date(d.setDate(diff));
}

function getFirstDayOfMonth(d) {

  d = new Date(d);
  d.setDate(1);
  return d;
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function datesBetween(timespan, startDate, endDate){

  var dates   = [];
  var end     = typeof endDate !== "undefined" ? new Date(endDate) : new Date();
  var current = new Date(startDate);

  if (timespan == 'm') current.setDate(1);
  else if (timespan == 'w') current = getMonday(startDate);

  while (current < end) {

    dates.push({'date' : new Date(current), 'str' : formatDate(current)}); 
    switch(timespan) {
      case 'd':
        current.setDate(current.getDate()+1);
        break;
      case 'w':
        current.setDate(current.getDate()+7);
        break;
      case 'm':
        current.setMonth(current.getMonth() + 1, 1);
        break;
      default:
        current.setDate(current.getDate()+7);
    }
  }

  return dates;
}

function dateDiffInDays(a, b) {
  var _MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Discard the time and time-zone information.
  var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function getMonthNames(){
  var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

  return monthNames;
}

//Style functions
function addTimeSpan(str){
  return '<br><span class="timespan">' + str + '</span>';
}

function updateProgressBar(id, value){
  document.getElementById(id).value = value;
}

function setScorecardColor(docId, realized, logic, objective){

  if (eval(realized + logic + objective)){
    document.getElementById(docId).style.backgroundColor = "green";
  }
  else if (eval(realized + logic + objective * 0.8)){
    document.getElementById(docId).style.backgroundColor = "yellow";
  }
  else{
    document.getElementById(docId).style.backgroundColor = "red";
  }
}

function insertBlankCells(rowArray){

  for (var i = 0; i < rowArray.length; i++) {
    var row       = rowArray[i];
    var blankCell = row.insertCell(-1);
    
    blankCell.style.borderBottom = "hidden";
    blankCell.style.borderTop    = "hidden";
  }
}

function fillPerformanceCell(cell, performance) {

  if (isNaN(performance) || performance < 0) {
    cell.innerHTML = "--";
  }
  else {
    cell.innerHTML = performance + " %";
    cell.style.backgroundColor = performance > 100 ?  "green" : performance < 80 ? "red" : "yellow";
  }
  if (performance == Infinity)   {
    cell.innerHTML = "&infin;"    
    cell.style.fontSize = "17px";
  }  
}

//Simple funtion utils
function performance(a, b){

  return (a/b * 100).toFixed(1);
}

function sum(array){
  return array.reduce(function(a, b) { return a + b });
}

function average(array){

  var total = 0;

  for(var i = 0; i < array.length; i++) {
      total += array[i];
  }

  return (total/array.length);
}

function intersect(array1, array2) {
  return array1.filter(function(n) {
    return array2.indexOf(n) != -1
  });
}

function occurrences(array){

  var occs = {};

  for(var i = 0; i< array.length; i++) {
      var n   = array[i];
      occs[n] = occs[n] ? occs[n] + 1 : 1;
  }
  return occs;
}

function getCountryFromCode(code) {
  var countrys = {"AF" : "Afghanistan","AX" : "Åland Islands","AL" : "Albania","DZ" : "Algeria","AS" : "American Samoa","AD" : "Andorra","AO" : "Angola","AI" : "Anguilla","AQ" : "Antarctica","AG" : "Antigua and Barbuda","AR" : "Argentina","AM" : "Armenia","AW" : "Aruba","AU" : "Australia","AT" : "Austria","AZ" : "Azerbaijan","BS" : "Bahamas","BH" : "Bahrain","BD" : "Bangladesh","BB" : "Barbados","BY" : "Belarus","BE" : "Belgium","BZ" : "Belize","BJ" : "Benin","BM" : "Bermuda","BT" : "Bhutan","BO" : "Bolivia (Plurinational State of)","BQ" : "Bonaire, Sint Eustatius and Saba","BA" : "Bosnia and Herzegovina","BW" : "Botswana","BV" : "Bouvet Island","BR" : "Brazil","IO" : "British Indian Ocean Territory","BN" : "Brunei Darussalam","BG" : "Bulgaria","BF" : "Burkina Faso","BI" : "Burundi","KH" : "Cambodia","CM" : "Cameroon","CA" : "Canada","CV" : "Cabo Verde","KY" : "Cayman Islands","CF" : "Central African Republic","TD" : "Chad","CL" : "Chile","CN" : "China","CX" : "Christmas Island","CC" : "Cocos (Keeling) Islands","CO" : "Colombia","KM" : "Comoros","CG" : "Congo","CD" : "Congo (Democratic Republic of the)","CK" : "Cook Islands","CR" : "Costa Rica","CI" : "Côte d'Ivoire","HR" : "Croatia","CU" : "Cuba","CW" : "Curaçao","CY" : "Cyprus","CZ" : "Czech Republic","DK" : "Denmark","DJ" : "Djibouti","DM" : "Dominica","DO" : "Dominican Republic","EC" : "Ecuador","EG" : "Egypt","SV" : "El Salvador","GQ" : "Equatorial Guinea","ER" : "Eritrea","EE" : "Estonia","ET" : "Ethiopia","FK" : "Falkland Islands (Malvinas)","FO" : "Faroe Islands","FJ" : "Fiji","FI" : "Finland","FR" : "France","GF" : "French Guiana","PF" : "French Polynesia","TF" : "French Southern Territories","GA" : "Gabon","GM" : "Gambia","GE" : "Georgia","DE" : "Germany","GH" : "Ghana","GI" : "Gibraltar","GR" : "Greece","GL" : "Greenland","GD" : "Grenada","GP" : "Guadeloupe","GU" : "Guam","GT" : "Guatemala","GG" : "Guernsey","GN" : "Guinea","GW" : "Guinea-Bissau","GY" : "Guyana","HT" : "Haiti","HM" : "Heard Island and McDonald Islands","VA" : "Holy See","HN" : "Honduras","HK" : "Hong Kong","HU" : "Hungary","IS" : "Iceland","IN" : "India","ID" : "Indonesia","IR" : "Iran (Islamic Republic of)","IQ" : "Iraq","IE" : "Ireland","IM" : "Isle of Man","IL" : "Israel","IT" : "Italy","JM" : "Jamaica","JP" : "Japan","JE" : "Jersey","JO" : "Jordan","KZ" : "Kazakhstan","KE" : "Kenya","KI" : "Kiribati","KP" : "Korea (Democratic People's Republic of)","KR" : "Korea (Republic of)","KW" : "Kuwait","KG" : "Kyrgyzstan","LA" : "Lao People's Democratic Republic","LV" : "Latvia","LB" : "Lebanon","LS" : "Lesotho","LR" : "Liberia","LY" : "Libya","LI" : "Liechtenstein","LT" : "Lithuania","LU" : "Luxembourg","MO" : "Macao","MK" : "Macedonia (the former Yugoslav Republic of)","MG" : "Madagascar","MW" : "Malawi","MY" : "Malaysia","MV" : "Maldives","ML" : "Mali","MT" : "Malta","MH" : "Marshall Islands","MQ" : "Martinique","MR" : "Mauritania","MU" : "Mauritius","YT" : "Mayotte","MX" : "Mexico","FM" : "Micronesia (Federated States of)","MD" : "Moldova (Republic of)","MC" : "Monaco","MN" : "Mongolia","ME" : "Montenegro","MS" : "Montserrat","MA" : "Morocco","MZ" : "Mozambique","MM" : "Myanmar","NA" : "Namibia","NR" : "Nauru","NP" : "Nepal","NL" : "Netherlands","NC" : "New Caledonia","NZ" : "New Zealand","NI" : "Nicaragua","NE" : "Niger","NG" : "Nigeria","NU" : "Niue","NF" : "Norfolk Island","MP" : "Northern Mariana Islands","NO" : "Norway","OM" : "Oman","PK" : "Pakistan","PW" : "Palau","PS" : "Palestine, State of","PA" : "Panama","PG" : "Papua New Guinea","PY" : "Paraguay","PE" : "Peru","PH" : "Philippines","PN" : "Pitcairn","PL" : "Poland","PT" : "Portugal","PR" : "Puerto Rico","QA" : "Qatar","RE" : "Réunion","RO" : "Romania","RU" : "Russia","RW" : "Rwanda","BL" : "Saint Barthélemy","SH" : "Saint Helena, Ascension and Tristan da Cunha","KN" : "Saint Kitts and Nevis","LC" : "Saint Lucia","MF" : "Saint Martin (French part)","PM" : "Saint Pierre and Miquelon","VC" : "Saint Vincent and the Grenadines","WS" : "Samoa","SM" : "San Marino","ST" : "Sao Tome and Principe","SA" : "Saudi Arabia","SN" : "Senegal","RS" : "Serbia","SC" : "Seychelles","SL" : "Sierra Leone","SG" : "Singapore","SX" : "Sint Maarten (Dutch part)","SK" : "Slovakia","SI" : "Slovenia","SB" : "Solomon Islands","SO" : "Somalia","ZA" : "South Africa","GS" : "South Georgia and the South Sandwich Islands","SS" : "South Sudan","ES" : "Spain","LK" : "Sri Lanka","SD" : "Sudan","SR" : "Suriname","SJ" : "Svalbard and Jan Mayen","SZ" : "Swaziland","SE" : "Sweden","CH" : "Switzerland","SY" : "Syrian Arab Republic","TW" : "Taiwan, Province of China","TJ" : "Tajikistan","TZ" : "Tanzania, United Republic of","TH" : "Thailand","TL" : "Timor-Leste","TG" : "Togo","TK" : "Tokelau","TO" : "Tonga","TT" : "Trinidad and Tobago","TN" : "Tunisia","TR" : "Turkey","TM" : "Turkmenistan","TC" : "Turks and Caicos Islands","TV" : "Tuvalu","UG" : "Uganda","UA" : "Ukraine","AE" : "United Arab Emirates","GB" : "United Kingdom","US" : "United States","UM" : "United States Minor Outlying Islands","UY" : "Uruguay","UZ" : "Uzbekistan","VU" : "Vanuatu","VE" : "Venezuela (Bolivarian Republic of)","VN" : "Viet Nam","VG" : "Virgin Islands (British)","VI" : "Virgin Islands (U.S.)","WF" : "Wallis and Futuna","EH" : "Western Sahara","YE" : "Yemen","ZM" : "Zambia","ZW" : "Zimbabwe"};

  return countrys[code] !== undefined ? countrys[code] : "NULL";
}