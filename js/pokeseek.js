const GOJUUON = [
    ["ア", "イ", "ウ", "エ", "オ"],
    ["カ", "キ", "ク", "ケ", "コ"],
    ["サ", "シ", "ス", "セ", "ソ"],
    ["タ", "チ", "ツ", "テ", "ト"],
    ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    ["マ", "ミ", "ム", "メ", "モ"],
    ["ヤ", "", "ユ", "", "ヨ"],
    ["ラ", "リ", "ル", "レ", "ロ"],
    ["ワ", "ヲ", "ン", "", "ー"]
];



// 初期表示
let word1 = "", word2 = "";
let startTime = null;
let mode = 0;

// 疑似乱数生成
function seededRandom(seed) {
  let x = seed | 0;
  return function () {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return ((x >>> 0) / 0xFFFFFFFF);
  };
}

function shuffleArray(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
return arr;
}
  
function getTodayWordPair() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${(date.getMonth() + 1)
    .toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;

  // seed値を文字列から生成
  let seed = 0;
  for (let i = 0; i < ymd.length; i++) {
    seed = (seed * 31 + ymd.charCodeAt(i)) >>> 0;
  }

  const rng = seededRandom(seed);
  const shuffled = shuffleArray(WORD_LIST, rng);
  return [shuffled[0], shuffled[1]];
}

function getRandomWordPair() {
  const date = new Date();
  const ymdhms = `${date.getFullYear()}${(date.getMonth() + 1)
    .toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}
    ${date.getHours().toString().padStart(2, "0")}
    ${date.getMinutes().toString().padStart(2, "0")}
    ${date.getSeconds().toString().padStart(2, "0")}`;

  // seed値を文字列から生成
  let seed = 0;
  for (let i = 0; i < ymdhms.length; i++) {
    seed = (seed * 31 + ymdhms.charCodeAt(i)) >>> 0;
  }

  const rng = seededRandom(seed);

  // シャッフルして2つ選ぶ
  if(mode === 2){ //初代限定
    const shuffled = shuffleArray(WORD_LIST_KANTO, rng);
    return [shuffled[0], shuffled[1]];
  }
  const shuffled = shuffleArray(WORD_LIST, rng);
  return [shuffled[0], shuffled[1]];
}


function normalizeKana(str) {
  
  const dakutenMap = {
//     が: "か", ぎ: "き", ぐ: "く", げ: "け", ご: "こ",
//     ざ: "さ", じ: "し", ず: "す", ぜ: "せ", ぞ: "そ",
//     だ: "た", ぢ: "ち", づ: "つ", で: "て", ど: "と",
//     ば: "は", び: "ひ", ぶ: "ふ", べ: "へ", ぼ: "ほ",
//     ぱ: "は", ぴ: "ひ", ぷ: "ふ", ぺ: "へ", ぽ: "ほ",
    ガ: "カ", ギ: "キ", グ: "ク", ゲ: "ケ", ゴ: "コ",
    ザ: "サ", ジ: "シ", ズ: "ス", ゼ: "セ", ゾ: "ソ",
    ダ: "タ", ヂ: "チ", ヅ: "ツ", デ: "テ", ド: "ト",
    バ: "ハ", ビ: "ヒ", ブ: "フ", ベ: "ヘ", ボ: "ホ",
    パ: "ハ", ピ: "ヒ", プ: "フ", ペ: "ヘ", ポ: "ホ",
    ヴ: "ウ",
  };

  const smallKanaMap = {
//      ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
//      ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ",
    ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ",
    ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ッ: "ツ"
  };

  return [...str].map(ch => {
    if (ch === "ー") return ch;
    return dakutenMap[ch] || smallKanaMap[ch] || ch;
  }).join("");
}

  
function countCharacters(w1, w2) {
  const count = {};
  const normalized = normalizeKana(w1 + w2);
  [...normalized].forEach(ch => {
    count[ch] = (count[ch] || 0) + 1;
  });
  return count;
}


function renderGrid(counts) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
  
    GOJUUON.flat().forEach((ch, index) => {
    const div = document.createElement("div");
    const count = counts[ch] || 0;

    div.className = `cell count-${Math.min(count, 5)}`;
    div.style.animationDelay = `${index * 20}ms`;

    if (ch) {
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.height = "100%";
      table.style.borderCollapse = "collapse";

      const tbody = document.createElement("tbody");

      // 1行目：文字
      const tr1 = document.createElement("tr");
      const td1 = document.createElement("td");
      td1.textContent = ch;
      td1.style.textAlign = "center";
      td1.style.fontWeight = "bold";
      tr1.appendChild(td1);

      // 2行目：回数（あれば）
      const tr2 = document.createElement("tr");
      const td2 = document.createElement("td");
      td2.textContent = count > 0 ? `×${count}` : "";
      td2.style.textAlign = "center";
      td2.style.fontSize = "0.8em";
      tr2.appendChild(td2);

      tbody.appendChild(tr1);
      tbody.appendChild(tr2);
      table.appendChild(tbody);

      div.appendChild(table);
    }

    grid.appendChild(div);
  });
}
  
  

function checkAnswer() {
  const g1 = document.getElementById("guess1").value.trim();
  const g2 = document.getElementById("guess2").value.trim();
  const result = document.getElementById("result");

  const normalize = (s) => [...normalizeKana(s)].sort().join("");
  const isCorrect =
    (normalize(g1) === normalize(word1) && normalize(g2) === normalize(word2)) ||
    (normalize(g2) === normalize(word1) && normalize(g1) === normalize(word2));

  void result.offsetWidth;

  const gameUrl = "https://ktnd9972f.github.io/pokeseek.html";
  if (isCorrect) {
      onCorrect();

      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
      if(mode === 0){
        shareText = `今日の2匹（🟥🟥🟥🟥🟥と🟦🟦🟦🟦🟦）を見破った！ (かかった時間：${timeTaken}秒)\n${gameUrl}\n#ポケシーク #デイリーチャレンジ #ポケモン`;
      }else{
        shareText = `隠れた2匹（${word1}と${word2}）を見破った！ (かかった時間：${timeTaken}秒)\n${gameUrl}\n#ポケシーク #フリープレイ #ポケモン`;
      }
      
      const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);
  
      result.innerHTML = `🎉 Congratulations！ (${timeTaken} 秒)<br>
        <a href="${shareUrl}" target="_blank" class="btn btn-outline-dark mt-2">
          X(Twitter)でシェアする
        </a>`;
      result.style.color = "green";
  } else {
      if(mode === 0){
        shareText = `今日の2匹（🟥🟥🟥🟥🟥と🟦🟦🟦🟦🟦）を見破れなかった😞 \n${gameUrl}\n#ポケシーク #デイリーチャレンジ #ポケモン`;
      }else{
        shareText = `隠れた2匹を見破れなかった😞\n${gameUrl}\n#ポケシーク #フリープレイ #ポケモン`;
      }
      const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);
    
      result.innerHTML = `❌ 不正解<br>
      <div class="fs-6 text-muted fw-normal">まだ回答を続けられます</div>
      <a href="${shareUrl}" target="_blank" class="btn btn-outline-dark mt-2">
            X(Twitter)でシェアする
      </a>
      `;
      result.style.color = "red";
  }

}


function onCorrect() {

  let count = 3;
  let interval = setInterval(() => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    count--;
    if (count === 0) clearInterval(interval);
  }, 300);
}
  




const example_counts = countCharacters("ピカチュウ", "イーブイ");
renderGrid(example_counts);

function gameStart(m){
  mode = m;
  const gameMode = document.getElementById("gameMode");
  const splitter = document.getElementById("splitter");
  if(mode === 0){
    [word1, word2] = getTodayWordPair();
    gameMode.innerHTML = `デイリーチャレンジ`;
  }else if(mode === 1){
    [word1, word2] = getRandomWordPair();
    gameMode.innerHTML = `フリープレイ（全国図鑑）`;
  }else{
    [word1, word2] = getRandomWordPair();
    gameMode.innerHTML = `フリープレイ（初代のみ）`;
  }
  splitter.innerHTML = `<hr>`;
  const counts = countCharacters(word1, word2);
  renderGrid(counts);

  // 表示切り替え
  document.getElementById("gameArea").style.display = "block";
  document.getElementById("beforeStart").style.display = "none";

  // 入力欄初期化
  document.getElementById("guess1").value = "";
  document.getElementById("guess2").value = "";
  document.getElementById("result").textContent = "";

  // タイマー開始
  startTime = Date.now();
  //console.log("お題のポケモン:", word1, word2);

  
}
