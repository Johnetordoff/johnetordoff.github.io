
$(document).ready(function(){
    tracker = $('#tracker').css('margin-left', 100);

    function wobble(){
        $('#tracker').css('margin-left', function (index, curValue) {
            if(parseInt(curValue, 10) + Math.random() * 2 > parseInt($('#tracker').parent().css('width'), 10) - 22 - Math.random() * 2){
                return 0;
            }else if(parseInt(curValue, 10) < 0){
                return parseInt($('#tracker').parent().css('width'), 10) - 20 - Math.random() * 2;
            }else{
                return parseInt(curValue, 10) + (Math.random() >= .5 ? - Math.random() * 2 : Math.random() * 2);
            }
        });
    }
    setInterval(wobble, 100);

    function play(){

        var startTime = new Date().getTime();
        var scoot_interval = setInterval(scoot, 100);
        function scoot(){
            if(new Date().getTime() - startTime > 900){
                clearInterval(scoot_interval);
                return;
            }
            $('#tracker').css('margin-left', function (index, curValue) {
                if(parseInt(curValue, 10) + Math.random() * 40 >= parseInt($('#tracker').parent().css('width'), 10) - 20 - Math.random() * 40){
                    return 0;
                }else{
                    return parseInt(curValue, 10) +  Math.random() * 40;
                }
            });


        };
    };
    function rewind(){
        var startTime = new Date().getTime();
        var rewind_scoot_interval = setInterval(rewind_scoot, 100);
        function rewind_scoot(){
            if(new Date().getTime() - startTime > 900){
                clearInterval(rewind_scoot_interval);
                return;
            }
            $('#tracker').css('margin-left', function (index, curValue) {
                if(parseInt(curValue, 10) < Math.random() * 7){
                    return parseInt($('#tracker').parent().css('width'), 10) - 20 - Math.random() * 40;
                }else{

                    return parseInt(curValue, 10) -  Math.random() * 40;
                }
            });
        };
    };
    $('#playbtn').click(play);
    $('#rewindbtn').click(rewind);
});
