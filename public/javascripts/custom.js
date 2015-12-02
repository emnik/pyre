
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
                // console.log("Found a difference in: "+key);
                // console.log(obj1[key]);
                // console.log(obj2[key]);
                return false;
            }
        };
    }
    //found no difference!
    return true;
}