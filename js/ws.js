
//https://blog.take-it-easy.site/web-develop/add-remove-elements-dynamic-with-javascript/


var characters = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉっゃゅょーゔゎ";
var characters2 = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポァィゥェォッャュョ～ヴヮ";
var CLEN = characters.length;

function update(c_arr) {
  for (var i = 0; i < CLEN; i++) {
    document.getElementById('cnt_' + (i)).innerText = c_arr[i];
    let panel_elem = document.getElementById('p_' + (i));
    panel_elem.classList.remove('bg-secondary');
    panel_elem.classList.remove('bg-info');
    panel_elem.classList.remove('bg-primary');
    panel_elem.classList.remove('bg-success');
    if(c_arr[i] == 0){
      panel_elem.classList.add('bg-secondary');
    }else if(c_arr[i] == 1){
      panel_elem.classList.add('bg-info');
    }else if(c_arr[i] == 2){
      panel_elem.classList.add('bg-primary');
    }else{
      panel_elem.classList.add('bg-success');
    }
  }

}

function switch_panel_visibility(){
  let begin = 11;
  let last = 20;
  let e1 = document.getElementById('gojuon_table_' + (begin));
  let is_visible = true;
  let c1 = document.getElementById('check1').checked;
  let c2 = document.getElementById('check2').checked;
  if(e1.classList.contains('d-none')){
    is_visible = false;
  }
  for (let i = begin; i < last+1; i++){
    let element = document.getElementById('gojuon_table_' + (i));
    if(is_visible){
      if(!c1 && !c2){element.classList.add('d-none');}
    }else{
      if(c1 || c2){element.classList.remove('d-none');}
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
  //console.log(str);
  
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
  //console.log(is_distinguish_dakuon.checked);
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
  //console.log(is_distinguish_sutegana.checked);
  if(is_distinguish_sutegana.checked == false){
    //ぁぃぅぇぉ
    for (var i = 0; i < 5; i++) {
      ctrarr[i] += ctrarr[71+i];
      ctrarr[71+i] = 0;
    }
    //っ
    ctrarr[17] += ctrarr[76];
    ctrarr[76] = 0;
    //ゎ
    ctrarr[43] += ctrarr[82];
    ctrarr[82] = 0;
    //ゃゅょ
    for (var i = 0; i < 3; i++) {
      ctrarr[35+i] += ctrarr[77+i];
      ctrarr[77+i] = 0;
    }
  }
  //console.log(ctrarr);
  update(ctrarr);
}

function draw(){

  ;
}



/**
 * フォームの追加
 */
function add_form_element() {
  
  // フォーム内の要素の数
  var formarea = document.querySelector('#form');
  var num = 0;
  if (formarea !== null) {
    num = formarea.childElementCount;
  }
  num++;
  
  // 入力欄の作成
  var text_form = create_text_from(num);
  
  // 削除ボタンの作成
  var del_btn = create_delete_btn(num);
  
  // 入力欄・削除ボタンをdiv要素に追加
  var form_area = document.createElement('div');
  form_area.setAttribute('id', 'form_area_' + num);
  form_area.appendChild(text_form);
  form_area.appendChild(del_btn);
  
  // フォームに要素を追加
  var form = document.getElementById('form');
  form.appendChild(form_area);
  
  // 削除ボタンの有効無効
  set_delete_btn_disabled();
  
  // 追加ボタンの有効無効
  set_add_btn_disabled();
};

/**
 * フォームの削除
 */
function delete_form_element(name) {
  // 対象フォームの削除
  var elem = document.getElementById(name);
  elem.remove();
  
  // 残っているフォームのIDの番号の振りなおしと削除ボタンの作り直し
  var forms = document.querySelector('#form').children;
  
  for (i = 0; i < forms.length; i++) {
    // フォームのIDの番号の付け直し
    forms[i].id = 'form_area_' + (i + 1);
    // 入力欄のIDの番号の付け直し
    forms[i].children[0].id = 'form_' + (i + 1);
    forms[i].children[0].name = 'form_' + (i + 1);
    // 削除ボタンは作り直し
    forms[i].children[1].remove();
    var btn = create_delete_btn(i + 1);
    forms[i].appendChild(btn);
  }
  
  // 削除ボタンの有効無効
  set_delete_btn_disabled();
  
  // 追加ボタンの有効無効
  set_add_btn_disabled();

  //アップデート
  count();
};

/**
 * 入力欄
 */
function create_text_from(num) {
  var text_form = document.createElement('input');
  text_form.setAttribute('type', 'text');
  text_form.setAttribute('id', 'form_' + num);
  text_form.setAttribute('name', 'form_' + num);
  text_form.setAttribute('oninput', 'count()');
  return text_form;
}

/**
 * 削除ボタン
 */
function create_delete_btn(num) {
  var btn = document.createElement('button');
  var icon = document.createElement('i');
  icon.setAttribute('class', 'bi bi-dash-circle');
  btn.appendChild(icon);
  btn.setAttribute('class', 'del_btn btn btn-sm bg-transparent');
  // これを入れないとサブミットされる
  btn.setAttribute('type', 'button');
  btn.setAttribute('onclick', 'delete_form_element("form_area_' + num + '");');
  return btn;
}

/**
 * 削除ボタンの有効無効の設定
 */
function set_delete_btn_disabled() {
  var form = document.getElementById('form');
  var buttons = form.getElementsByTagName('button');
  if (buttons.length == 1) {
    buttons[0].disabled = true;
  }
  else {
    for (i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
  }
}

/**
 * 追加ボタンの有効無効の設定
 */
function set_add_btn_disabled() {
  var form = document.getElementById('form');
  var buttons = form.getElementsByTagName('button');
  if (buttons.length < 30) {
    document.getElementsByClassName('add-btn')[0].disabled = false;
  }
  else {
    document.getElementsByClassName('add-btn')[0].disabled = true;
  }
}



function checkbox(){
  count();
  switch_panel_visibility();
}

function change_button_size(){
  var windowSize = window.innerWidth;
  for (var i = 0; i < CLEN; i++) {
    let panel_elem = document.getElementById('p_' + (i));
    
    panel_elem.classList.remove('btn-lg');
    panel_elem.classList.remove('btn-sm');
    
    if (windowSize < 768) {
      panel_elem.classList.add('btn-sm');
    } else {
      panel_elem.classList.add('btn-lg');
    }
  }

}
window.onresize = function () {
  change_button_size();
};


window.onload = function () {
  // フォームの追加
  add_form_element();
  add_form_element();
  add_form_element();
  add_form_element();
  add_form_element();
  // ボタンサイズの調整
  change_button_size();
};