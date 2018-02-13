$(document).ready(function(){
    $('.glitch').each(function(ind, el){
        if(el.getAttribute('data-text') == null){
            el.setAttribute('data-text', el.innerHTML);
        }
    });
});