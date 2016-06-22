define([], function(){
    return function CycleBuffer() {
        var self = this;

        self.array = [];
        self.beginPointer = 0;
        self.endPointer = 0;
        self.length = 0;


        self.push = function(element) {
            if(self.beginPointer != 0) {
                if(self.beginPointer == self.endPointer) {
                    self.array = self.toArray();
                    self.beginPointer = 0;
                    self.endPointer = self.array.length;
                }else{
                    self.endPointer %= self.array.length;
                }
            }

            self.array[self.endPointer++] = element;
            self.length++;
        };

        self.removeFirst = function(amount) {
            if(amount >= self.length) {
                self.beginPointer = 0;
                self.endPointer = 0;
                self.length = 0;
            }else{
                self.beginPointer += amount
                self.beginPointer %= self.array.length;
                self.length -= amount;
            }
        }

        self.toArray = function() {
            var beginPointer = self.beginPointer;
            var endPointer = self.endPointer;
            var array = self.array;

            if(beginPointer == 0 && endPointer == 0) {
                return [];
            }

            if(endPointer > beginPointer) {
                return array.slice(beginPointer, endPointer);
            }

            var result = array.slice(beginPointer);

            result.push.apply(result, array.slice(0, endPointer));

            return result;
        }
    };
})