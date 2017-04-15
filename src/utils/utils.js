define([], function(){

	function isEmptyObject(obj) {
		for(var prop in obj) {
			if(obj.hasOwnProperty(prop)) return false;
		}

		return true;
	}

	return {isEmptyObject: isEmptyObject};
})