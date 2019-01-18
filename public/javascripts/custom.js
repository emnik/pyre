
Array.prototype.compare = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].compare(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}



/**
* I convert a day string to an number.
*
* @method dayOfWeekAsInteger
* @param {String} day
* @return {Number} Returns day as number
*/

function dayOfWeekAsInteger(day) {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][day];
}




/**
* Compare 2 arrays with subarrays whose values are objects!.
* for example arr1 = [{id1:value1, id2:value2, ...},{id1:value1, id2:value2, ...}]
* and arr2 = [{id1:value1, id2:value2, ...},{id1:value1, id2:value2, ...}]
*
* @method compare_arrays_of_obj
* @param {arrays of objects} arr1, arr2
* @return {Boolean} Returns true if the arrays are the same or false if not
*/
function compare_arrays_of_obj(arr1, arr2){
    if(arr1.length!=arr2.length){
        // console.log("not the same array length");
        return false;
    }
    else {
        var length=arr1.length;
    }
    //itterating the array:
    for (var i = length - 1; i >= 0; i--) {
        var obj1 = arr1[i];
        var obj2 = arr2[i];
        if(Object.keys(obj1).length != Object.keys(obj2).length){
            // console.log("the objects are not the same length");
            return false;
        }
        for (var key in obj1) {
            if(obj1[key]!=obj2[key]){ //I know they have exactly the same keys. If there would be a difference then it wound be in the values
                console.log("Found a difference in: "+key);
                // console.log(obj1[key]);
                // console.log(obj2[key]);
                return false;
            }
        };
    }
    //found no difference!
    return true;
}


/**
* Compare 2 arrays with subarrays whose values are objects!.
* This function might be more generic than the above... I have to check it ...
*/
function isEqual(value, other) {

	// Get the value type
	var type = Object.prototype.toString.call(value);

	// If the two objects are not the same type, return false
	if (type !== Object.prototype.toString.call(other)) return false;

	// If items are not an object or array, return false
	if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

	// Compare the length of the length of the two items
	var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
	var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
	if (valueLen !== otherLen) return false;

	// Compare two items
	var compare = function (item1, item2) {

		// Get the object type
		var itemType = Object.prototype.toString.call(item1);

		// If an object or array, compare recursively
		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
			if (!isEqual(item1, item2)) return false;
		}

		// Otherwise, do a simple comparison
		else {

			// If the two items are not the same type, return false
			if (itemType !== Object.prototype.toString.call(item2)) return false;

			// Else if it's a function, convert to a string and compare
			// Otherwise, just compare
			if (itemType === '[object Function]') {
				if (item1.toString() !== item2.toString()) return false;
			} else {
				if (item1 !== item2) return false;
			}

		}
	};

	// Compare properties
	if (type === '[object Array]') {
		for (var i = 0; i < valueLen; i++) {
			if (compare(value[i], other[i]) === false) return false;
		}
	} else {
		for (var key in value) {
			if (value.hasOwnProperty(key)) {
				if (compare(value[key], other[key]) === false) return false;
			}
		}
	}

	// If nothing failed, return true
	return true;

};


/*Cookie Functions*/

function createCookie(name, value)
{
    document.cookie=name+"="+escape(value)+"; path=/";
}

function readCookie(name)
{
    var re=new RegExp("(?:^|;)\\s?"+name+"=(.*?)(?:;|$)", "i"), result=document.cookie.match(re), output=null;
    if (result!=null)
    {
        output=unescape(result[1]);
    }
    return output;
}

function eraseCookie(name)
{
    var d=new Date();
    document.cookie=name+"=; path=/; expires="+d.toUTCString();
}


