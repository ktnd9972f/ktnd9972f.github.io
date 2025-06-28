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
let isGaveUp = 0;

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

function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
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
  
function isSameCount(c1, c2) {
  const keys1 = Object.keys(c1);
  const keys2 = Object.keys(c2);
  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (c1[key] !== c2[key]) return false;
  }
  return true;
}

function giveUp(){
  isGaveUp = 1;
  checkAnswer();
} 

function mapCountsToQuiz(counts) {
  const mapping = {
    1: "🟥",
    2: "🟦",
    3: "🟨",
    4: "🟪"
  };

  const values = Object.values(counts)
    .sort((a, b) => b - a);

  return values.map(count => {
    if (count >= 5) return "⬛";
    return mapping[count] || "";
  }).join("");
}

function checkAnswer() {
  const g1 = toKatakana(document.getElementById("guess1").value.trim());
  const g2 = toKatakana(document.getElementById("guess2").value.trim());
  const result = document.getElementById("result");
  const c1 = countCharacters(word1, word2);
  const c2 = countCharacters(g1, g2);
  const isCorrect = (isSameCount(c1, c2) && WORD_LIST.includes(g1) && WORD_LIST.includes(g2));
  void result.offsetWidth;
  
  const quiz = mapCountsToQuiz(c1);
  const gameUrl = "https://ktnd9972f.github.io/pokeseek.html";
  if (isCorrect) {
      onCorrect();

      const hintInfo = isHintUsed ?  "" : "🎉ノーヒントで";
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
      if(mode === 0){
        shareText = hintInfo+`今日のお題（`+quiz+`）の2匹のポケモンを見破った！ (かかった時間：${timeTaken}秒)\n#ポケシーク #デイリーチャレンジ #ポケモン\n${gameUrl}`;
      }else{
        //word1とword2の場合、同じ文字数で違う組の場合、入力した回答とシステムが用意した回答が異なる場合があるため、入力をもとに出力
        shareText = `お題：`+quiz+`\n`+hintInfo+`隠れた2匹のポケモン（${g1}と${g2}）を見破った！ (かかった時間：${timeTaken}秒)\n#ポケシーク #フリープレイ #ポケモン\n${gameUrl}`;
      }
      
      const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);
  
      result.innerHTML = `🎉 特定成功！ (${timeTaken} 秒)<br>`;
      result.style.color = "green";

      const shareBtn = document.createElement("button");
      shareBtn.className = "btn btn-outline-dark mt-2";
      shareBtn.textContent = "X(Twitter)でシェアする";
      shareBtn.onclick = () => window.open(shareUrl, '_blank');
      result.appendChild(shareBtn);
  } else {
      if(mode === 0){
        shareText = `今日のお題（`+quiz+`）のポケモンを見破れなかった😞 \n#ポケシーク #デイリーチャレンジ #ポケモン\n${gameUrl}`;
      }else{
        shareText = `お題：`+quiz+`\n隠れた2匹を見破れなかった😞\n#ポケシーク #フリープレイ #ポケモン\n${gameUrl}`;
      }
      const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);
    
      result.innerHTML = isGaveUp ? `🏳️ ギブアップ<br>
      <div class="fs-6 text-muted fw-normal">2匹のポケモンは${word1}と${word2}でした</div>`:
      `❌ 不正解<br>
      <div class="fs-6 text-muted fw-normal">まだ回答を続けられます</div>
      ` ;
      if(isGaveUp){
        const shareBtn = document.createElement("button");
        shareBtn.className = "btn btn-outline-dark mt-2";
        shareBtn.textContent = "X(Twitter)でシェアする";
        shareBtn.onclick = () => window.open(shareUrl, '_blank');
        result.appendChild(shareBtn);
      }
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
  


/* ヒント機能 */
let currentHintIndex = 0;
let hintMessages = [];
let isHintUsed = 0;

function useHint(){
  isHintUsed = 1;
}

function generateHints(word1, word2) {
  const t1 = `<table class="table table-borderless w-75 mx-auto">
    <thead><tr>
      <th colspan="2" class="h5">ヒント`;
  const t2 = `</th>
    </tr></thead>
    <tbody><tr>
      <td><strong>1匹目のポケモン</strong></td><td class="text-start">`;
  const t3 = `</td></tr>
    <tr>
      <td><strong>2匹目のポケモン</strong></td>
      <td class="text-start">`;
  const t4 = `</td>
    </tr></tbody>
  </table>`
  const hints = [
    t1+`1/3`+t2+`${word1[0]}${"〇".repeat(word1.length - 1)}`+t3+`${"〇".repeat(word2.length)}`+t4,
    t1+`2/3`+t2+`${word1[0]}${"〇".repeat(word1.length - 1)}`+t3+`${word2[0]}${"〇".repeat(word2.length - 1)}`+t4,
    t1+`3/3`+t2+`${word1}`+t3+`${word2[0]}${"〇".repeat(word2.length - 1)}`+t4,
  ];
  return hints;
}

function updateHintModal(messages, index) {
  const prevBtn = document.getElementById("prevHintBtn");
  const nextBtn = document.getElementById("nextHintBtn");
  const hintText = document.getElementById("hintText");
  if (hintText) {
    hintText.innerHTML = messages[index];
  }

  if (prevBtn && nextBtn) {
    prevBtn.disabled = (index === 0);
    nextBtn.disabled = (index === messages.length - 1);
  }

}


document.getElementById("nextHintBtn").addEventListener("click", () => {
  if (currentHintIndex < hintMessages.length - 1) {
    currentHintIndex++;
    updateHintModal(hintMessages, currentHintIndex);
  }
});

document.getElementById("prevHintBtn").addEventListener("click", () => {
  if (currentHintIndex > 0) {
    currentHintIndex--;
    updateHintModal(hintMessages, currentHintIndex);
  }
});





const example_counts = countCharacters("ピカチュウ", "イーブイ");
renderGrid(example_counts);

function gameStart(m){
  // パラメータの初期化
  mode = m;
  isHintUsed = 0;
  isGaveUp = 0;

  // ウィンドウ制御
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


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

  // ヒント機能初期化
  currentHintIndex = 0;
  hintMessages = generateHints(word1, word2);
  updateHintModal(hintMessages, currentHintIndex);

  // タイマー開始
  startTime = Date.now();
  //console.log("お題のポケモン:", word1, word2);


}
