var characters = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉっゃゅょーゔ";
var characters2 = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポァィゥェォッャュョ～ヴ";
var CLEN = characters.length;

function update(c_arr) {
  for (var i = 0; i < CLEN; i++) {
    document.getElementById('cnt_' + (i)).innerText = c_arr[i];
    let panel_elem = document.getElementById('p_' + (i));
    if(c_arr[i] == 0){
      panel_elem.setAttribute('class', 'btn btn-lg bg-secondary w-100 text-light');
    }else if(c_arr[i] == 1){
      panel_elem.setAttribute('class', 'btn btn-lg bg-info w-100 text-light');
    }else if(c_arr[i] == 2){
      panel_elem.setAttribute('class', 'btn btn-lg bg-primary w-100 text-light');
    }else{
      panel_elem.setAttribute('class', 'btn btn-lg bg-success w-100 text-light');
    }
  }

}


function count() {
  var v1 = 0;
  var buttons = form.getElementsByTagName('button');
var ctrarr = new Array(characters.length);
  ctrarr.fill(0);
  var str = "";
  for (let i = 0; i < buttons.length; i++){
    let element = document.getElementById('form_' + (i + 1));
    let s = String(element.value);
    str += s;
    
  }
  console.log(str);
  
  for (var i = 0; i < str.length; i++) {
    var char = str.charAt(i);
    for (var j = 0; j < CLEN; j++) {
      if(char == characters[j] || char == characters2[j]){
        ctrarr[j]++;
      }
    }
  }

  //濁音・半濁音の区別
  let is_distinguish_dakuon = document.getElementById('check1');
  console.log(is_distinguish_dakuon.checked);
  if(is_distinguish_dakuon.checked == false){
    //がぎぐげござじずぜぞだぢづでど
    for (var i = 0; i < 15; i++) {
      ctrarr[5+i] += ctrarr[46+i];
      ctrarr[46+i] = 0;
    }
    //ばびぶべぼぱぴぷぺぽ
    for (var i = 0; i < 5; i++) {
      ctrarr[25+i] += ctrarr[61+i];
      ctrarr[25+i] += ctrarr[66+i];
      ctrarr[61+i] = 0;
      ctrarr[66+i] = 0;
    }
    //ヴ
    ctrarr[2] += ctrarr[81];
    ctrarr[81] = 0;
  }

  //捨て仮名の区別
  let is_distinguish_sutegana = document.getElementById('check2');
  console.log(is_distinguish_sutegana.checked);
  if(is_distinguish_sutegana.checked == false){
    //ぁぃぅぇぉ
    for (var i = 0; i < 5; i++) {
      ctrarr[i] += ctrarr[71+i];
      ctrarr[71+i] = 0;
    }
    //っ
    ctrarr[17] += ctrarr[76];
    ctrarr[76] = 0;
    //ゃゅょ
    for (var i = 0; i < 3; i++) {
      ctrarr[35+i] += ctrarr[77+i];
      ctrarr[77+i] = 0;
    }
  }
  console.log(ctrarr);
  update(ctrarr);
}

function draw(){

  ;
}

