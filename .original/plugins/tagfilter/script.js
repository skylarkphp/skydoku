/* DOKUWIKI:include_once script/select2/select2.js */
/* DOKUWIKI:include_once script/select2/select2_locale_de.js */
/* DOKUWIKI:include_once script/jquery.history.js */
/**
 * DokuWiki Plugin tagfilter (JavaScript Component) 
 *
 * @license GPL 2 (http://www.gnu.org/licenses/gpl.html)
 * @author  lisps
 */
var tagfilter_container = {};
function getSelectByFormId(id){
	return jQuery('select.tagdd_select_'+id);
}

function tagfilter_cleanform(id,refresh){
	//elements = getElementsByClass('tagdd_select',document.getElementById('tagdd_'+id),'select');
	var $elements = getSelectByFormId(id);
	$elements.select2('val','');

	if(refresh) $elements[0].onchange();

	
}

function tagfilter_submit(id,ns,flags)
{
	var form = new Array();
	var pagesearch= new Array();
	var $elements = getSelectByFormId(id);

	
	var tags = jQuery('#tagdd_'+id).data('tags');

	jQuery.each(tags,function(index,select_r) {
		jQuery.each(select_r,function(index2,page_r){
			tags[index][index2] = jQuery.map(page_r,function(value){
				return [value];
			});
		});
	});
	
	count = 0;
	for(var i=0;i<$elements.length;i++){
		e = $elements[i];
		//if(e.selectedIndex != -1)
			form[i] = new Array();
		for(var k=0;k<e.options.length;k++){
			if(e.options[k].selected && e.options[k].value != ''){
				if(e.id == '__tagfilter_page_'+id) {
					pagesearch.push(e.options[k].value);	
				}
				else {
					form[i].push(e.options[k].value);
					count++;
				}
			}
		}
	}
	
	if(flags[1]['pagesearch'] == true) { //delete pagesearch element
		form.shift();
	}
	
	var pages = new Array();
	var page_idx = 0;
	
	jQuery.each(form,function(index,select) { //loop through select boxes and collect the pages
		if(jQuery.isArray(select) && select.length) {	
			pages[page_idx] = new Array();
			jQuery.each(select,function(index2,tag) {
				pages[page_idx] = jQuery.merge(pages[page_idx],tags[index][tag]);
			});
			pages[page_idx] = jQuery.unique(pages[page_idx]);
			page_idx++;
		} 
	});
	
	if(pagesearch.length == 0 && page_idx == 0) { //nothings selected => show all
		jQuery('#tagfilter_ergebnis_'+id+' .pagelist tr').each(function (){
			if(flags[1]['noneonclear']) {
				var $tr = jQuery(this);
		        var $link = $tr.find('td.page a');
				if($link.length == 0) {
		        	$tr.show();
		        	return;
		        }
				$tr.hide();
			} else {
				jQuery(this).show();
			}
			
		});


	} else {
	
		var pages_filtered = new Array();
		pages_filtered = pages.shift();
		jQuery.each(pages,function(index,page_r) { //intersect pages
			pages_filtered = jQuery(pages_filtered).filter(page_r);
		});
		
		if(page_idx == 0 && pagesearch.length != 0) { 
			pages_filtered = pagesearch;
		} else if (pagesearch.length != 0) { //intersect pagesearch
			pages_filtered = jQuery(pages_filtered).filter(pagesearch);
		}
		
		//loop all found searchentries
	    jQuery('#tagfilter_ergebnis_'+id+' .pagelist tr').each(function (e){
	        var $tr = jQuery(this);
	        var $link = $tr.find('td.page a');
	        if($link.length == 0) {
	        	$tr.show();
	        	return;
	        }
	        var id = $link.attr('title');
	        
	        if(jQuery.inArray(id,pages_filtered) == -1) {
	        	$tr.hide();
	        } else {
	        	$tr.show();
	        }
	    });
	}
	if(flags[1]['count']) {
		jQuery('#__tagfilter_'+id).find('.tagfilter_count_number').text(jQuery('#tagfilter_ergebnis_'+id+' .pagelist tr:visible').length + ' / ' + jQuery('#tagfilter_ergebnis_'+id+' .pagelist tr').length);
	}
}

jQuery().ready(function(){
	var clean_r = [];
	if(JSINFO['tagfilter']){
		jQuery(JSINFO['tagfilter']).each(function(k,tf_elmt){
			var $tf_dd = jQuery('#tagdd_'+tf_elmt.key +' [data-label="'+tf_elmt.label+'"]');

			if($tf_dd){
				if(jQuery.inArray(tf_elmt.key,clean_r) === -1){
					tagfilter_cleanform(tf_elmt.key,false);
					clean_r.push(tf_elmt.key);
				}
				$tf_dd.val(tf_elmt.values);
			}
		});
	} else if (History.getState().data.tagfilter) { //Fix for IE9
		var params = History.getState().data.tagfilter;
		
		jQuery(params).each(function(k,tf_elmt){
			var $tf_dd = jQuery('#tagdd_'+tf_elmt.key +' [data-label="'+tf_elmt.label+'"]');
			if($tf_dd){
				if(jQuery.inArray(tf_elmt.key,clean_r) === -1){
					tagfilter_cleanform(tf_elmt.key,false);
					clean_r.push(tf_elmt.key);
				}

				if($tf_dd.val()){
					var val_tmp = $tf_dd.val();
					if(!jQuery.isArray(val_tmp)) val_tmp = new Array(val_tmp);
					val_tmp.push(tf_elmt.value);
					$tf_dd.val(val_tmp);
				}
				else 
					$tf_dd.val(tf_elmt.value);
			}
		});
	}
	
	jQuery('form[data-plugin=tagfilter]').each(function(i,v){
		jQuery(v).find('select')[0].onchange();
	});
	
	jQuery('form[data-plugin=tagfilter]').each(function(i,v){
		jQuery(v).find('select.chosen').select2({
			width:'200',
			allowClear: true,
			dropdownAutoWidth:true,
			formatResult:tagfilter_selectFormatSelection,
			formatSelection:tagfilter_selectFormatSelection
		});
	});

	//console.log(jQuery('fieldset'));
	/**
	 * put the selected tags into the url for later use (browser history)
	 * 
	 */
	jQuery(window).on('beforeunload',function(e){
		var $tagfilter_r = jQuery('form[data-plugin="tagfilter"]');
		//tagfilter found?
		if($tagfilter_r.length){
			var tf_params = [];
			var tf_object = [];
			$tagfilter_r.each(function(i,tagfilter){
				var $tagfilter = jQuery(tagfilter);
				//search for each dropdown field inside a tagfilter
				$tagfilter.find('select').each(function(i,dd){
					var $dd = jQuery(dd);
					var value = $dd.val();
					var type = jQuery.type(value);
					if(!value)return;
					
					//add selected fields to tf_params
					if(type === 'string') {
						tf_params.push(encodeURIComponent('tf' + $tagfilter.attr('data-idx')+'_'+$dd.attr('data-label'))+'[]='+encodeURIComponent(value));
						tf_object.push({'key':$tagfilter.attr('data-idx'),'label':$dd.attr('data-label'),'value':value});
					}
					if(type === 'array') {
						jQuery(value).each(function(i,v){
							tf_params.push(encodeURIComponent('tf' + $tagfilter.attr('data-idx')+'_'+$dd.attr('data-label'))+'[]='+encodeURIComponent(v));
							tf_object.push({'key':$tagfilter.attr('data-idx'),'label':$dd.attr('data-label'),'value':v});
						});
					}
				});
				
			});
			
			var state = History.getState();

			var url = state.url.split('?');
			if(url[1])
				var url_params = url[1].split('&');
			else 
				var url_params = [];
				
			var old_params = [];
			jQuery(url_params).each(function(k,v){
				if(tagfilter_strpos(v,'tf',0) !== 0) //hack but should almost work ;)
					old_params.push(v);
			});
			
			old_params = old_params.concat(tf_params);
			//console.log(old_params.join('&'));
			//console.log(History.getState())

			History.replaceState({'tagfilter':tf_object},'tagfilter',url[0] + '?' + old_params.join('&'));
		}
	});
	
});
/**
 * copied from http://phpjs.org/functions/strpos/ 
 */
function tagfilter_strpos (haystack, needle, offset) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Onno Marsman
  // +   bugfixed by: Daniel Esteban
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: strpos('Kevin van Zonneveld', 'e', 5);
  // *     returns 1: 14
  var i = (haystack + '').indexOf(needle, (offset || 0));
  return i === -1 ? false : i;
}

function tagfilter_selectFormatResult(val) {
	//console.log('tagfilter_selectFormatResult',val);
	return (val.text); 
	/*
	if(!(value in '.$jsVar.')) {return "";}
	return [
		('.$jsVar.'[value]["link"] == false) ? "":
			"<span style=\'float:right;height:100%;vertical-align:center;padding-top:3px;\'>"+
				"<img style=\'height:'.($flags['multi']?'32px':'32px').'\' src=\'"+'.$jsVar.'[value]["link"]+"\'>"+
			"</span>",
			"<span>"+text+"</span>",
		('.$jsVar.'[value]["link"] == false) ? "":"<div style=\'clear:both;\'></div>"
	].join("");
	}*/
}
function tagfilter_selectFormatSelection(val) {
	//console.log('tagfilter_selectFormatSelection',val);
	var $select = jQuery(val.element).parent();
	var tagimage = $select.data('tagimage');
	var tagtext = "<span>"+val.text+"</span>";
	
	if(!tagimage) return tagtext;
	var tagimage_link = tagfilter_container[tagimage][val.id]['link'];
	if(tagimage && tagimage_link) {
		return [
			"<span style=\'float:right;height:100%;vertical-align:center;padding-top:3px;\'>"+
				"<img style='height:32px' src='"+tagimage_link+"'></span>",
			"<span>"+val.text+"</span>",
			"<div style=\'clear:both;\'></div>"
			].join("");
	} else {
		return tagtext; 
	}
	
}

jQuery(function(){
	jQuery('div.plugin_tagcompare form[data-plugin=tagcompare]').each(function(i,v){
		jQuery(v).find('select').select2({
			width:'200',
			allowClear: true,
			dropdownAutoWidth:true,
			placeholder: "",
			
		}).on('change', function(){
			this.form.submit();
//			$form = jQuery(this.form);
//			
//			jQuery.ajay({
//				//url:$form.attr('')
//				data:
//			});
		});
	});
});
 
