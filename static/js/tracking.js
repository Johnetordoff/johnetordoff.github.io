var rightTracks = 0;
var leftTracks = 0;


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
        $('#tv').css('margin-top', function (index, curValue) {
            if(parseInt(curValue, 10) - 10 < parseInt($('#tv').parent().css('height'), 10)){
                return 0;
            }else{
                return parseInt(curValue, 10) + (Math.random() >= .5 ? - 3 : 3);
            }

        });
    }
    setInterval(wobble, 500);

    function play(){
        var startTime = new Date().getTime();
        var scoot_interval = setInterval(scoot, 100);
        function scoot(){
            if(new Date().getTime() - startTime > 500){
                clearInterval(scoot_interval);
                return;
            }
            $('#tracker').css('margin-left', function (index, curValue) {
                if(parseInt(curValue, 10) + Math.random() * 5 >= parseInt($('#tracker').parent().css('width'), 10) - 20 - Math.random() * 5){
                    return 0;
                }else{
                    return parseInt(curValue, 10) +  Math.random() * 5;
                }
            });


        };

    };
    function rewind(){
        var startTime = new Date().getTime();
        var rewind_scoot_interval = setInterval(rewind_scoot, 100);
        function rewind_scoot(){
            if(new Date().getTime() - startTime > 500){
                clearInterval(rewind_scoot_interval);
                return;
            }
            $('#tracker').css('margin-left', function (index, curValue) {
                if(parseInt(curValue, 10) < Math.random() * 5){
                    return parseInt($('#tracker').parent().css('width'), 10) - 20 - Math.random() * 5;
                }else{

                    return parseInt(curValue, 10) -  Math.random() * 5;
                }
            });
        };
    };
    $('#playbtn').click(play);
    $('#rewindbtn').click(rewind);

    document.addEventListener('keyup', function(env){
        if(env.which == 37){
            rewind();
            leftTracks++;
            var value = parseFloat($('#tv').css("opacity"));
            if(value<1){
                value -= 0.065;
                $('#tv').css("opacity", value);
            };
            if(leftTracks % 8 == 0){
                $('#rewindbtn').click()
            }
        }
        if(env.which == 39){
            play();
            rightTracks++;
            leftTracks--;
            var value = parseFloat($('#tv').css("opacity"));
            if(value<1){
                value += 0.065;
                $('#tv').css("opacity", value);
                $('#tv').css("animated", value);
            };
            $("#myCarousel").removeClass('screen');
            if(rightTracks < 0){
                rightTracks = 0;
            }
            console.log(rightTracks);
            if(rightTracks % 20 == 0 && rightTracks != 0){
                rightTracks = 0;
                $('#playbtn').click();
                $("#myCarousel").addClass('screen');
                var interval = setInterval(function(){
                    var value = parseFloat($('#tv').css("opacity"));
                    value -= 0.05;
                    $('#tv').css("opacity", value);
                    if($('#tv').css("opacity") <= 0){
                        clearInterval(interval);
                    }
                }, 20);
            }
        }
    });
});

