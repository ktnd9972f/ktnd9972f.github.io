
const default_height = 4;
const default_width = 3;
const default_depth = 4;
const default_string = "いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑいもせすん";
let new_height = default_height;
let new_width = default_width;
let new_depth = default_depth;
let new_string = default_string;

window.onload = putUsageDependingOnDevice;

function setZero(){
    new_height = 0;
    new_width = 0;
    new_depth = 0;
}

function generateGrids() {
    const container = document.getElementById("input-wrapper");
    new_height = parseInt(document.getElementById("in_height").value, 10);
    new_width = parseInt(document.getElementById("in_width").value, 10);
    new_depth = parseInt(document.getElementById("in_depth").value, 10);

    const lower_limit = 1;
    const upper_limit = 14;
    const total_num_limit = 1000;
    //入力値に応じたエラーメッセージを出力する
    if(new_height < lower_limit || upper_limit < new_height || 
        new_width < lower_limit || upper_limit < new_width ||
        new_depth < lower_limit || upper_limit < new_depth){
        const errorMessage = document.getElementById("error_message");
        errorMessage.textContent = "縦、横、奥行きのブロックの数は1から10まで設定できます";
        setZero();
    }else if(new_height*new_width*new_depth > total_num_limit){
        const errorMessage = document.getElementById("error_message");
        errorMessage.textContent = "ブロックの合計数は1000以下になるようにしてください";
        setZero();
    }else{  //許可された入力値
        const errorMessage = document.getElementById("error_message");
        errorMessage.textContent = "";
    }
    
    container.innerHTML = "";

    for (let q = 0; q < new_depth; q++) {
        // 個別のグリッドコンテナを作成
        const gridContainer = document.createElement("div");
        gridContainer.className = "grid-container";
        gridContainer.style.gridTemplateColumns = `repeat(${new_width}, auto)`;

        // グリッドを作成
        for (let i = 0; i < new_height; i++) {
            for (let j = 0; j < new_width; j++) {
                const input = document.createElement("input");
                input.type = "text";
                tmp_className_string = "input-cell colored-input-"
                input.className = tmp_className_string+String(q);
                gridContainer.appendChild(input);
            }
        }

        // グリッドをメインコンテナに追加
        container.appendChild(gridContainer);
    }
}

function getFirstCharactersAsString(){
    const inputs = document.querySelectorAll('input.input-cell');
    const values = Array.from(inputs).map((inputElement) => inputElement.value);
    const concatenatedString = values.map(value => 
        value.length > 0 ? value[0] : ' ' // 要素が空なら半角スペース、そうでなければ1文字目
    ).join('');
    return concatenatedString;
}

function setParametersCaller(){
    
    const new_string = getFirstCharactersAsString();
    setParameters(new_height, new_width, new_depth, new_string);

}

function putUsageDependingOnDevice() {
    const userAgent = navigator.userAgent.toLowerCase();

    // ユーザーエージェントに応じた操作方法を出力
    if (userAgent.includes("iphone") || userAgent.includes("android")) {
        const deviceMessage1 = document.getElementById("usage-rotation");
        deviceMessage1.textContent = "1本指でドラッグ(スライド)";
        const deviceMessage2 = document.getElementById("usage-translation");
        deviceMessage2.textContent = "2本指でドラッグ(スライド)";
        const deviceMessage3 = document.getElementById("usage-scaling");
        deviceMessage3.textContent = "ピンチイン/ピンチアウト";
    } else {
        const deviceMessage1 = document.getElementById("usage-rotation");
        deviceMessage1.textContent = "左クリック＋マウス移動";
        const deviceMessage2 = document.getElementById("usage-translation");
        deviceMessage2.textContent = "右クリック＋マウス移動";
        const deviceMessage3 = document.getElementById("usage-scaling");
        deviceMessage3.textContent = "マウスホイール"; 
    }
}