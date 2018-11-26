$(document).ready(function() {
    $(document).on("click", "button#addQuesion", addQuestion);
});

function addQuestion() {
    switch (this.val()) {
        case 1:
        case 2:
        case 3:
        case 11:
            break;
        case 12:
            //
            break;
        case 13:
            //
            break;
        case 14:
            //
            break;
        case 21:
        case 31:
        case 41:
            //
            break;
    }
}

var templates = {
    question: $("#question").html().trim()
};

var Radio = function(qty) {
    var $this = $("<section>").append($(templates.question)).data("qty", qty);
    $("main section").last().insertAfter(this.$this);
    
    switch (qty) {
        case 11:
            this.initDefault();
            break;
        case 12:
            this.initColor();
            break;
        case 13:
            this.initSymbol();
            break;
        case 14:
            this.initSize();
            break;
    }
};

Radio.prototype.constructor = Radio;

Radio.prototype.initDefault = function() {
    
};