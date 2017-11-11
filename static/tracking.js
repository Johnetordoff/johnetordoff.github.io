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
            rewind()
            rightTracks--;
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
            play()
            rightTracks++;
            leftTracks--;
            var value = parseFloat($('#tv').css("opacity"));
            if(value<1){
                value += 0.065;
                $('#tv').css("opacity", value);
                $('#tv').css("animated", value);
            };
            $("#myCarousel").removeClass('screen');
            if(rightTracks % 20 == 0){
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
        console.log(env.which);

    });

    (function() {
	"use strict";

	var canvas = document.querySelector("#tv"),
		context = canvas.getContext("2d"),
		scaleFactor = 2.5, // Noise size
		samples = [],
		sampleIndex = 0,
		scanOffsetY = 0,
		scanSize = 0,
		FPS = 12,
		scanSpeed = FPS * 15, // 15 seconds from top to bottom
		SAMPLE_COUNT = 10;

	window.onresize = function() {
		canvas.width = canvas.offsetWidth / scaleFactor;
		canvas.height = canvas.width / (canvas.offsetWidth / canvas.offsetHeight);
		scanSize = (canvas.offsetHeight / scaleFactor) / 5;

		samples = []
		for(var i = 0; i < SAMPLE_COUNT; i++)
			samples.push(generateRandomSample(context, canvas.width, canvas.height));
	};

	function interpolate(x, x0, y0, x1, y1) {
		return y0 + (y1 - y0)*((x - x0)/(x1 - x0));
	}


	function generateRandomSample(context, w, h) {
		var intensity = [];
		var random = 0;
		var factor = h / 150;
		var intensityCurve = [];
		for(var i = 0; i < Math.floor(h / factor) + factor; i++)
			intensityCurve.push(Math.floor(Math.random() * 50));

		for(var i = 0; i < h; i++) {
			var value = interpolate((i/factor), Math.floor(i / factor), intensityCurve[Math.floor(i / factor)], Math.floor(i / factor) + 1, intensityCurve[Math.floor(i / factor) + 1]);
			intensity.push(value);
		}

		var imageData = context.createImageData(w, h);
		for(var i = 0; i < (w * h); i++) {
			var k = i * 4;
			var color = Math.floor(36 * Math.random());
			// Optional: add an intensity curve to try to simulate scan lines
			color += intensity[Math.floor(i / w)];
			if(color > 30){
			color = color + Math.random() * 150
			imageData.data[k] = imageData.data[k + 1] = color
			imageData.data[k + 2] = color;
			imageData.data[k + 3] = 255;
			}
		}
		return imageData;
	}

	function render() {
		context.putImageData(samples[Math.floor(sampleIndex)], 0, 0);

		sampleIndex += 30 / FPS; // 1/FPS == 1 second
		if(sampleIndex >= samples.length) sampleIndex = 0;

		var grd = context.createLinearGradient(0, scanOffsetY, 0, scanSize + scanOffsetY);

		grd.addColorStop(0, 'rgba(255,255,255,0)');
		grd.addColorStop(0.1, 'rgba(255,255,255,0)');
		grd.addColorStop(0.2, 'rgba(255,255,255,0.2)');
		grd.addColorStop(0.3, 'rgba(255,255,255,0.0)');
		grd.addColorStop(0.45, 'rgba(255,255,255,0.1)');
		grd.addColorStop(0.5, 'rgba(255,255,255,1.0)');
		grd.addColorStop(0.55, 'rgba(255,255,255,0.55)');
		grd.addColorStop(0.6, 'rgba(255,255,255,0.25)');
		//grd.addColorStop(0.8, 'rgba(255,255,255,0.15)');
		grd.addColorStop(1, 'rgba(255,255,255,0)');

		context.fillStyle = grd;
		context.fillRect(0, scanOffsetY, canvas.width, scanSize + scanOffsetY);
		context.globalCompositeOperation = "lighter";

		scanOffsetY += (canvas.height / scanSpeed);
		if(scanOffsetY > canvas.height) scanOffsetY = -(scanSize / 2);

        console.log(FPS);
        console.log(rightTracks);

		window.setTimeout(function() {
			window.requestAnimationFrame(render);
		}, 1000 / FPS);
	}
	window.onresize();
	window.requestAnimationFrame(render);
})();
});
