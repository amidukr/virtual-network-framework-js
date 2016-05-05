Array.prototype.removeValue = function(value) {
	var offset = this.indexOf(value);

    if( offset == -1) return false;

    this.splice(offset, 1);
    return true;
}