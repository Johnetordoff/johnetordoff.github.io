$(document).ready(function(){

    function update() {

        $('.switch').each(function(ind, el){
            if(Math.random() * 1 > .5){
            if(el.style.display === 'none'){
                $(el).css('display', 'inline');
            }else{
                $(el).css('display', 'none');
            }
            }
        });
    }
    setInterval(update, 10);

});