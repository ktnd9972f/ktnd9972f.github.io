/* ==========================================================================
   深い海に沈む / メインスクリプト
   --------------------------------------------------------------------------

     0. CONFIG (沈下速度・生物や岩礁の出現頻度など、調整用パラメータのまとめ)
     1. 初期設定・ヘルパー関数
     2. クラゲ(jelly)の状態とその描画
     3. タップ時のリアクション演出(rings)
     4. 漂う粒子(マリンスノー)
     5. 背景と太陽光の演出
     6. 深海生物の演出 (エビ・タコ・深海魚など15種。マリンスノーと同じ下から上への流れだがロジックは別)
     7. 背景の岩礁演出 (ときおり現れる岩礁のシルエット)
     8. 深度ゾーン名の表示
     8. 導入テキストの制御
     9. 入力(タップ/クリック)処理
     10. リサイズ対応
     11. メインループ
   ========================================================================== */
(function(){
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const depthValueEl = document.getElementById('depthValue');
  const zoneAnnounceEl = document.getElementById('zoneAnnounce');
  const zoneAnnounceJaEl = document.getElementById('zoneAnnounceJa');
  const zoneAnnounceEnEl = document.getElementById('zoneAnnounceEn');
  const zoneCornerEl = document.getElementById('zoneCorner');
  const zoneCornerJaEl = document.getElementById('zoneCornerJa');
  const zoneCornerEnEl = document.getElementById('zoneCornerEn');
  const introEl = document.getElementById('intro');

  // OSやブラウザで「視差効果を減らす」設定がされている場合は、揺れや速度を控えめにする
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==========================================================================
  // CONFIG: 演出のパラメータを一箇所にまとめたもの。
  // 沈下速度・生物や岩礁の出現頻度・見た目の各種調整。
  // ==========================================================================
  const CONFIG = {
    // 深海へ沈んでいく速さ(1秒あたり何m沈むか)
    descentSpeedMps: 0.7,

    // 深海生物(エビ・タコ・深海魚など11種)の出現・挙動
    creatures: {
      enabled: true,
      minDepthM: 200,          // この深度(m)を超えるまでは生物を出現させない
      // 出現間隔(秒)は固定値ではなく、深度に応じて spawnIntervalMaxSec〜spawnIntervalMinSec の
      // あいだを、鋭く尖った山を持つカーブで変化する(詳しくはspawnIntervalForDepth()を参照)
      spawnIntervalMinSec: 20,   // 最も出現しやすい深度での平均間隔(秒)
      spawnIntervalMaxSec: 110,  // 最も出現しにくい深度での平均間隔(秒)
      spawnPeakPeriodM: 5000,    // 山(高頻度になる深度)が現れる周期(m)。10000mまでに2回山が来る
      spawnSharpness: 6,         // 山の鋭さ。大きいほど山が狭く、谷(低頻度領域)が広くなる
      maxConcurrent: 12,        // 同時に出現できる最大数
      riseSpeedMinPxSec: 6,    // 上へ流れる速さの範囲(px/秒)
      riseSpeedMaxPxSec: 16,
      swaySpeedMin: 0.15,      // 左右にゆらぐ速さの範囲
      swaySpeedMax: 0.35,
      swayAmpMinPx: 5,         // 左右にゆらぐ振れ幅の範囲(px)
      swayAmpMaxPx: 15,
      scaleVarianceMin: 0.85,  // 個体ごとの大きさのばらつき(基準サイズに対する倍率)
      scaleVarianceMax: 1.15,
      jellyRealCm: 30,         // クラゲの目安の大きさ(傘の直径、cm)。生物の実寸との比較基準
      unitSize: 40,            // 各drawXxx関数が想定しているローカル座標の基準サイズ
      opacity: 0.42,           // 生物全体の不透明度(下げるほど背景になじむ透明感が増す)
      glowBlur: 16,            // 輪郭ににじませる淡いグロー(光のにじみ)の強さ
      maxTiltRad: 0.32         // 漂いに応じてランダムに傾く最大角度(ラジアン。約18度)
    },

    // 背景の岩礁シルエット演出
    rocks: {
      enabled: false,
      spawnIntervalSec: 240,   // 平均何秒に1回出現するか
      maxConcurrent: 1,
      riseSpeedMinPxSec: 3,    // 生物よりゆっくり上へ流れる
      riseSpeedMaxPxSec: 5.5
    },

    // 漂う粒子(マリンスノー)
    particles: {
      speedMinPxSec: 8,
      speedMaxPxSec: 30,
      glowProbability: 0.12,   // 発光する粒子(プランクトン風)になる確率
      tintProbability: 0.02,   // 白ではなく淡い色になる確率(ごくまれ)
      countMin: 30,
      countMax: 90,
      densityDivisor: 16000    // 画面面積 ÷ この値 で個数を決める
    },

    // クラゲ本体の脈動・漂い・タップ反応
    jelly: {
      pulseSpeed: 1.05,        // 脈動(呼吸)の速さ
      pulseAmpNormal: 0.055,   // 脈動の振れ幅(通常時)
      pulseAmpReduced: 0.02,   // 脈動の振れ幅(視差効果を減らす設定の場合)
      reactionDurationSec: 3.6,// タップ反応(収縮→発光→復帰)にかける秒数
      driftAmpXFactor: 0.09,   // 漂う動きの横方向の振れ幅(画面の短辺に対する比率)
      driftAmpYFactor: 0.06,   // 漂う動きの縦方向の振れ幅(画面の短辺に対する比率)
      maxTiltRad: 0.16         // 漂いに応じて傾く最大角度(ラジアン。約9度)
    },

    // 太陽光の演出
    lightBeams: {
      count: 6,
      baseAlpha: 0.11,     // 水面付近での明るさ
      depthFadeRate: 2.6   // 深度が増すほど弱まる速さ(大きいほど早く消える)
    }
  };

  let width = 0, height = 0; // 現在のCSSピクセルでの画面サイズ。resize()で更新される。

  // ---------- 色まわりのヘルパー関数 ----------
  // "#A9D9F2" のようなHEX文字列を [R,G,B] の配列に変換
  function hexToRgb(hex){
    hex = hex.replace('#','');
    const n = parseInt(hex,16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  // HEX文字列 + 透明度 から rgba(...) 文字列を作る
  function hexToRgba(hex, a){
    const [r,g,b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0,a) + ')';
  }
  function lerp(a,b,t){ return a + (b-a)*t; } // 線形補間(aからbへtの割合で進んだ値)
  function lerpRgb(c1,c2,t){
    return [lerp(c1[0],c2[0],t), lerp(c1[1],c2[1],t), lerp(c1[2],c2[2],t)];
  }
  // [R,G,B] 配列 + 透明度 から rgba(...) 文字列を作る(色を毎フレーム混ぜるときに使う)
  function rgbToRgba(rgb, a){
    return 'rgba(' + (rgb[0]|0) + ',' + (rgb[1]|0) + ',' + (rgb[2]|0) + ',' + Math.max(0,a) + ')';
  }

  // 背景色は「深度の進み具合 t (0=水面付近 〜 1=深海の闇)」に応じて
  // 以下の5色のあいだをなめらかに補間して決める
  const bgStops = [
    {t:0,    c:[46,124,147]},  // 水面付近の明るい青緑
    {t:0.25, c:[27,75,104]},
    {t:0.5,  c:[14,44,69]},
    {t:0.75, c:[7,22,38]},
    {t:1,    c:[2,6,13]}       // 深海の闇
  ];
  function bgColorAt(t){
    t = Math.min(1, Math.max(0,t));
    for(let i=0;i<bgStops.length-1;i++){
      const a = bgStops[i], b = bgStops[i+1];
      if(t>=a.t && t<=b.t){
        const lt = (t-a.t)/(b.t-a.t);
        const c = lerpRgb(a.c,b.c,lt);
        return 'rgb(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ')';
      }
    }
    return 'rgb(2,6,13)';
  }

  // ---------- クラゲ本体 ----------
  // タップした瞬間の発光色はこの中からランダムに選ばれる
  const bioColors = ['#9FE8D8','#C9A6F0','#F2C9E4','#8FD1F0','#faefb0','#dd9e9e','#bafac5'];

  // 深海生物・岩礁の発光斑点や体色に使う、青みに統一した控えめなパレット
  // (クラゲのタップ反応色bioColorsとはあえて分け、背景となじむ寒色でまとめている)
  const DEEP_PALETTE = ['#9BC7E0','#7EAFC6','#5F8BA6','#486A82','#2D4557'];

  // マリンスノーはほぼ白だが、ごくまれに(CONFIG.particles.tintProbability)この中から淡い色になる
  const SNOW_TINTS = ['#fffab5','#d4bbf8','#ffb8d4','#c8ffe5','#F5EFD9','#ffb3d1','#a4f5ce','#fde692'];

  const jelly = {
    x:0, y:0,           // 実際の描画位置(基準位置+ゆらぎ。毎フレーム更新される)
    baseX:0, baseY:0,   // 画面中央付近の基準位置。resize()で設定
    radius:70,
    pulseSpeed:CONFIG.jelly.pulseSpeed,    // 脈動(呼吸)の速さ
    pulseAmp: reducedMotion ? CONFIG.jelly.pulseAmpReduced : CONFIG.jelly.pulseAmpNormal, // 脈動の振れ幅
    phase: Math.random()*10,       // 脈動の位相(個体差を出すためランダム)
    driftPhaseX: Math.random()*10, // 漂う動きの位相(横方向)
    driftPhaseY: Math.random()*10, // 漂う動きの位相(縦方向)
    reactionT:null,        // タップ後の経過時間。反応していない間は null
    reactionDuration: CONFIG.jelly.reactionDurationSec, // タップ反応(収縮→発光→復帰)にかける秒数
    flashColor:null,       // 直近のタップで選ばれた発光色
    glowColor:'#A9D9F2',   // 通常時の発光色(少し青白い色に設定)
    coreColor:'#EAF6FF',   // 傘の中心付近の明るい色
    edgeColor:'#4C7FA8',   // 傘の縁の色
    tiltAngle:0,           // 現在の傾き(ラジアン)。updateJellyDrift()が毎フレーム更新する
    tentacles:[],
    arms:[]
  };

  // クラゲが「生きている」ように見せるための、数秒〜数十秒周期のゆっくりした漂流。
  // 周期の異なる複数のサイン波を重ねることで、機械的でない自然な揺れを作っている。
  // 横方向に大きく漂う瞬間(dxが大きいとき)を「傾く契機」とみなし、
  // 水流に押されて少し傾くような演出(tiltAngle)も同時に作っている。
  function updateJellyDrift(time){
    const ampX = Math.min(width,height)*CONFIG.jelly.driftAmpXFactor; // 横方向にどれだけ動けるか(画面サイズに比例)
    const ampY = Math.min(width,height)*CONFIG.jelly.driftAmpYFactor; // 縦方向の可動幅
    const dx = Math.sin(time*0.9  + jelly.driftPhaseX)*0.15   // 数秒周期の小さな揺れ
             + Math.sin(time*0.18 + jelly.driftPhaseX*1.7)*0.5 // 数十秒周期の大きな揺れ
             + Math.sin(time*0.045+ jelly.driftPhaseX*2.3)*0.5; // さらに長い周期の揺れ
    const dy = Math.sin(time*0.7  + jelly.driftPhaseY)*0.15
             + Math.sin(time*0.15 + jelly.driftPhaseY*1.9)*0.5
             + Math.sin(time*0.038+ jelly.driftPhaseY*2.6)*0.5;
    jelly.x = jelly.baseX + dx*ampX;
    jelly.y = jelly.baseY + dy*ampY;
    // dxが大きい(横に大きく漂っている)ときほど強く傾く。常に水平ではなく、
    // 漂いの大きさという「契機」に応じて自然に傾き、収まればまた水平に戻る。
    jelly.tiltAngle = Math.max(-1, Math.min(1, dx)) * CONFIG.jelly.maxTiltRad;
  }

  // 触手(tentacles)と口腕(arms)のパラメータをランダムに初期化。
  // 本数・長さ・揺れ方に個体差を持たせることで単調に見えないようにしている。
  function initAppendages(){
    jelly.tentacles = Array.from({length:8}, (_,i)=>({
      offsetX: (i-3.5)*16 + (Math.random()-0.5)*6, // 傘の下でのX方向の付け根位置
      length: 100+Math.random()*70,
      waveSpeed: (0.7+Math.random()*0.6) * (reducedMotion?0.4:1),
      amplitude: (10+Math.random()*10) * (reducedMotion?0.4:1),
      phase: Math.random()*10
    }));
    jelly.arms = Array.from({length:4}, (_,i)=>({ // armsは触手より太く短い「口腕」
      offsetX: (i-1.5)*10,
      length: 55+Math.random()*25,
      waveSpeed: (0.9+Math.random()*0.5) * (reducedMotion?0.4:1),
      amplitude: (7+Math.random()*6) * (reducedMotion?0.4:1),
      phase: Math.random()*10
    }));
  }
  initAppendages();

  // クリック/タップ位置がクラゲの傘の範囲内かどうかを判定
  function pointInJelly(px,py){
    const dx = px - jelly.x;
    const dy = py - (jelly.y + jelly.radius*0.2);
    return Math.sqrt(dx*dx+dy*dy) < jelly.radius*1.35;
  }

  // ---------- タップ時のリアクション演出 ----------
  const rings = []; // タップのたびに1つずつ追加される、ゆっくり広がる光の輪

  // reactionT (タップからの経過秒数) を 0→1→0 のなめらかな曲線に変換する。
  // sin(π×進行度) を使うことで、立ち上がりも収まりもゆっくりになる。
  function reactionGlow(){
    if(jelly.reactionT===null) return 0;
    return Math.sin(Math.PI * Math.min(1, jelly.reactionT/jelly.reactionDuration));
  }

  // 通常の発光色(glowColor)からタップ時の発光色(flashColor)へ、
  // reactionGlow() の値に応じてなめらかに混ぜ合わせた色を返す。
  // これにより「色が一瞬で切り替わる」のではなく「じわっと色が変わって戻る」ようになる。
  function jellyColorRgb(){
    const glow = reactionGlow();
    const base = hexToRgb(jelly.glowColor);
    if(glow<=0.001 || !jelly.flashColor) return base;
    const flash = hexToRgb(jelly.flashColor);
    return lerpRgb(base, flash, glow);
  }

  // クラゲをタップしたときに呼ばれる。反応タイマーを開始し、光の輪を1つ追加する。
  function triggerReaction(){
    jelly.reactionT = 0;
    jelly.flashColor = bioColors[Math.floor(Math.random()*bioColors.length)];
    rings.push({
      x:jelly.x, y:jelly.y, t:0,
      duration: jelly.reactionDuration,
      r0: jelly.radius*0.5,   // 輪の初期半径
      rGrow: jelly.radius*0.85, // 最終的にどれだけ半径が伸びるか
      maxAlpha: 0.3
    });
  }

  // 毎フレーム、反応タイマーと光の輪の状態を進める
  function updateFx(dt){
    if(jelly.reactionT !== null){
      jelly.reactionT += dt;
      if(jelly.reactionT > jelly.reactionDuration) jelly.reactionT = null; // 反応終了
    }
    for(let i=rings.length-1;i>=0;i--){
      const r = rings[i];
      r.t += dt;
      if(r.t > r.duration) rings.splice(i,1); // 寿命が来た輪は削除
    }
  }

  // 光の輪を描画。進行度pに応じて半径が広がり、中間で最も明るく、両端で透明になる
  function drawFx(){
    const color = jelly.flashColor || jelly.glowColor;
    rings.forEach(r=>{
      const p = r.t/r.duration;
      const radius = r.r0 + r.rGrow*p;
      const alpha = r.maxAlpha * Math.sin(Math.PI*p);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI*2);
      ctx.strokeStyle = hexToRgba(color, alpha);
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();
    });
  }

  // ---------- 漂う粒子(マリンスノー) ----------
  const particles = [];
  // 1個の粒子データを作る。fromBottom=trueなら画面下端から、falseなら画面内のランダムな位置から始まる
  function makeParticle(fromBottom){
    const cfg = CONFIG.particles;
    return {
      x: Math.random()*width,
      y: fromBottom ? height+10 : Math.random()*height,
      r: 0.6+Math.random()*1.8,
      speed: (cfg.speedMinPxSec + Math.random()*(cfg.speedMaxPxSec-cfg.speedMinPxSec)) * (reducedMotion?0.5:1), // 上へ流れる速さ
      alpha: 0.15+Math.random()*0.35,
      phase: Math.random()*10,
      glow: Math.random()<cfg.glowProbability, // 発光する粒子(生物発光のプランクトン風)にする確率
      // 基本は白(#DDEFEA)。ごくまれにSNOW_TINTSの中から淡い色になる
      color: Math.random()<cfg.tintProbability
        ? SNOW_TINTS[Math.floor(Math.random()*SNOW_TINTS.length)]
        : '#DDEFEA'
    };
  }
  function initParticles(){
    particles.length = 0;
    const cfg = CONFIG.particles;
    // 画面面積に応じて個数を決める(小さい画面で数が多すぎないように上限・下限を設定)
    const count = Math.max(cfg.countMin, Math.min(cfg.countMax, Math.floor((width*height)/cfg.densityDivisor)));
    for(let i=0;i<count;i++) particles.push(makeParticle(false));
  }
  function updateParticles(dt, time){
    for(let i=0;i<particles.length;i++){
      const p = particles[i];
      p.y -= p.speed*dt;                          // ゆっくり上へ流れる(=沈んでいる感覚の演出)
      p.x += Math.sin(time*0.25+p.phase)*4*dt;     // 左右にわずかに揺れる
      if(p.y < -10){                               // 画面上端を超えたら下端から再スタート
        Object.assign(p, makeParticle(true));
        p.x = Math.random()*width;
      }
    }
  }
  function drawParticles(time){
    particles.forEach(p=>{
      if(p.glow){
        const blink = 0.4+0.6*Math.max(0, Math.sin(time*1.3+p.phase)); // ゆっくり点滅
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r*1.8, 0, Math.PI*2);
        ctx.fillStyle = hexToRgba('#9FE8D8', p.alpha*blink);
        ctx.shadowColor = '#9FE8D8';
        ctx.shadowBlur = 6;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = hexToRgba(p.color, p.alpha);
        ctx.fill();
      }
    });
  }

  // ---------- 背景と太陽光 ----------
  // 画面全体を、深度tに応じた色のグラデーションで塗りつぶす
  function drawBackground(t){
    const topT = Math.max(0, t-0.12);   // 画面上のほうは少し明るめ
    const bottomT = Math.min(1, t+0.08); // 画面下のほうは少し暗め
    const grad = ctx.createLinearGradient(0,0,0,height);
    grad.addColorStop(0, bgColorAt(topT));
    grad.addColorStop(1, bgColorAt(bottomT));
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,width,height);
  }

  // 水面近くに差し込む光の筋(light shafts)。
  // 各光は「位置・揺れ方・またたき方」をそれぞれ独立したパラメータで持たせ、
  // 水面の波によるゆらぎ(コースティクス)のような、不規則で生命感のある揺らめきにしている。
  // 本数もランダムな間隔で配置し、機械的な等間隔さを避けている。
  const lightBeams = Array.from({length:CONFIG.lightBeams.count}, ()=>({
    xFrac: Math.random(),                    // 画面上のどこに出るか(0〜1、不規則な間隔)
    swaySpeed: 0.025+Math.random()*0.05,     // 横揺れの速さ(個体差あり)
    swayAmp: 14+Math.random()*30,            // 横揺れの振れ幅
    swayPhase: Math.random()*10,
    flickerSpeedA: 0.12+Math.random()*0.22,  // またたきの主成分
    flickerSpeedB: 0.5+Math.random()*0.9,    // またたきの細かい揺らぎ成分
    flickerPhase: Math.random()*10,
    widthBase: 55+Math.random()*70,
    alphaScale: 0.55+Math.random()*0.7       // 光ごとの明るさの個体差
  }));

  function drawLightBeams(t, time){
    const baseAlpha = Math.max(0, CONFIG.lightBeams.baseAlpha*(1 - t*CONFIG.lightBeams.depthFadeRate)); // 深度が増すほど急速に弱まる
    if(baseAlpha <= 0.003) return; // ほぼ見えない濃度なら描画自体を省略(軽量化)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 光が重なる部分がより明るくなるモード

    lightBeams.forEach(b=>{
      // 2つの周波数のサイン波を掛け合わせることで、水面の揺らぎが作る
      // 「ゆっくり明滅しつつ、時々きらっと強く光る」ような不規則なまたたきにする
      const flickerMain = 0.5+0.5*Math.sin(time*b.flickerSpeedA + b.flickerPhase);
      const flickerFine = 0.75+0.25*Math.sin(time*b.flickerSpeedB + b.flickerPhase*1.7);
      const alpha = baseAlpha * b.alphaScale * flickerMain * flickerFine;
      if(alpha <= 0.002) return;

      const bx = width*b.xFrac + Math.sin(time*b.swaySpeed + b.swayPhase)*b.swayAmp;
      const w = b.widthBase * (0.9+0.1*flickerFine);
      const grad = ctx.createLinearGradient(bx,0,bx+w,height*0.9);
      grad.addColorStop(0, hexToRgba('#BFEFE0', alpha));
      grad.addColorStop(1, 'rgba(191,239,224,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx-w*0.5,0);
      ctx.lineTo(bx+w*1.5,0);
      ctx.lineTo(bx+w*0.75,height);
      ctx.lineTo(bx-w*1.25,height);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  // ---------- クラゲの描画 ----------
  // 触手/口腕のリストを1本ずつ、根本から先端へ波打つ曲線として描く。
  // glow(発光の強さ)が大きいほど揺れ幅が少し大きくなる。
  function drawAppendages(list, baseX, baseY, time, colorRgb, lineWidth, glow){
    list.forEach(t=>{
      ctx.save();
      ctx.shadowColor = rgbToRgba(colorRgb, 1);
      ctx.shadowBlur = 12;
      ctx.strokeStyle = rgbToRgba(colorRgb, 0.45);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      const bx = baseX + t.offsetX;
      let px = bx, py = baseY;
      ctx.beginPath();
      ctx.moveTo(px,py);
      const segs = 7; // 曲線を7つの区間に分けて滑らかに繋ぐ
      for(let s=1; s<=segs; s++){
        const frac = s/segs;
        const wave = Math.sin(time*t.waveSpeed + t.phase + frac*3.2) * t.amplitude * frac * (1+glow*0.5);
        const nx = bx+wave;
        const ny = baseY + t.length*frac;
        const midx = (px+nx)/2, midy = (py+ny)/2;
        ctx.quadraticCurveTo(px,py,midx,midy);
        px = nx; py = ny;
      }
      ctx.lineTo(px,py);
      ctx.stroke();
      ctx.restore();
    });
  }

  // クラゲ本体(傘＋触手＋口腕)を1フレーム分描画する
  function drawJellyfish(time){
    const glow = reactionGlow();

    // 呼吸のような脈動の基本サイクル(-1〜1を行き来する)
    const breathe = Math.sin(time*jelly.pulseSpeed + jelly.phase);
    // 幅と高さをあえて逆方向に反応させることで、
    // 「全体が均等に拡大縮小する」のではなく「傘がすぼまる/開く」ような
    // 本物のクラゲに近い脈動になる。
    // (幅が縮む=傘を閉じる ときは、高さはむしろ伸びて縦長のドーム状になる)
    const widthPulse  = 1 + breathe*jelly.pulseAmp - glow*0.14;
    const heightPulse = 1 - breathe*jelly.pulseAmp*0.6 - glow*0.10;
    const bellW = jelly.radius*widthPulse;
    const bellH = jelly.radius*0.72*heightPulse;
    const colorRgb = jellyColorRgb(); // 通常色↔発光色を滑らかに混ぜた現在の色

    // 傘・触手・口腕をまとめて同じ回転の中で描くことで、
    // 「常に水平」ではなく、漂いに応じて全体が一体として少し傾くようにする。
    ctx.save();
    ctx.translate(jelly.x, jelly.y);
    ctx.rotate(jelly.tiltAngle);

    // 触手・口腕は傘より先(下)に描いて、傘の裏側から生えているように見せる
    // (回転後のローカル座標系の原点(0,0)を基準にする)
    drawAppendages(jelly.arms, 0, bellH*0.18, time, colorRgb, 4, glow);
    drawAppendages(jelly.tentacles, 0, bellH*0.18, time, colorRgb, 1.8, glow);

    ctx.shadowColor = rgbToRgba(colorRgb, 1);
    ctx.shadowBlur = 35+glow*35; // タップ直後(glowが高い)ほど発光がにじむ

    // 傘の塗り。中心は明るいcoreColor、外側に向かってcolorRgb→edgeColor(透明)へ
    const grad = ctx.createRadialGradient(0,-bellH*0.4,bellW*0.05, 0,0,bellW*1.05);
    grad.addColorStop(0, hexToRgba(jelly.coreColor, 0.9));
    grad.addColorStop(0.55, rgbToRgba(colorRgb, 0.55+glow*0.2));
    grad.addColorStop(1, hexToRgba(jelly.edgeColor, 0));

    // 傘の輪郭(ベジェ曲線でドーム型を作る)
    ctx.beginPath();
    ctx.moveTo(-bellW,0);
    ctx.bezierCurveTo(-bellW,-bellH*1.7, bellW,-bellH*1.7, bellW,0);
    ctx.bezierCurveTo(bellW*0.65, bellH*0.3, -bellW*0.65, bellH*0.3, -bellW,0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 傘の内側に、放射状の淡い筋(模様)を描いて質感を出す
    // (傘の輪郭は最大でも高さ約1.275*bellHまでしかないため、線の起点はそれより内側の1.15*bellHに収め、
    //  頂点からはみ出さないようにしている)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexToRgba(jelly.coreColor, 0.22);
    ctx.lineWidth = 1;
    for(let i=-3;i<=3;i++){
      ctx.beginPath();
      ctx.moveTo(i*bellW*0.11, -bellH*1.15);
      ctx.quadraticCurveTo(i*bellW*0.2, -bellH*0.6, i*bellW*0.32, -bellH*0.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 深海生物の演出 ----------
  // マリンスノー(粒子)と同じく「画面下から現れて漂いながら上へ抜けていく」動きだが、
  // ロジックはマリンスノーとは完全に別に持たせている(スケール・種類・発光斑点などが異なるため)。
  //
  // サイズは「クラゲの実際の大きさ」を基準(CONFIG.creatures.jellyRealCm)にして、
  // 各生物の実寸(sizeCm)との比率からピクセルサイズを逆算している。
  // 例: クラゲ(30cm)よりオキナエビ(18cm)は小さく、フクロウナギ(90cm)は大きく描かれる。
  // 出現頻度・速度・大きさのばらつきなどのパラメータは CONFIG.creatures にまとめてある。

  // 生物の種類ごとの設定(実寸cm・体色・専用の描画関数)
  const CREATURE_TYPES = {
    nautilus:    { sizeCm:20, color:'#9BC7E0', draw:drawNautilus },     // オウムガイ
    dumbo:       { sizeCm:20, color:'#8CC4E8', draw:drawDumbo },        // メンダコ
    seacucumber: { sizeCm:25, color:'#7EAFC6', draw:drawSeaCucumber },  // ナマコ
    barreleye:   { sizeCm:15, color:'#9BC7E0', draw:drawBarreleye },    // デメニギス
    isopod:      { sizeCm:35, color:'#7EAFC6', draw:drawIsopod },       // ダイオウグソクムシ
    anglerfish:  { sizeCm:45, color:'#8CC4E8', draw:drawAnglerfish },   // アンコウ
    shrimp:      { sizeCm:18, color:'#9BC7E0', draw:drawDeepShrimp },   // オキナエビ
    chimaera:    { sizeCm:80, color:'#8CC4E8', draw:drawChimaera },     // ギンザメ
    yeticrab:    { sizeCm:8,  color:'#9BC7E0', draw:drawYetiCrab },     // ユノハナガニ
    viperfish:   { sizeCm:30, color:'#7EAFC6', draw:drawViperfish },    // ホウライエソ
    gulpereel:   { sizeCm:90, color:'#8CC4E8', draw:drawGulperEel },    // フクロウナギ
    giantsquid:  { sizeCm:120,color:'#8CC4E8', draw:drawGiantSquid },   // ダイオウイカ(実際の比率ではなく設定上の値)
    vampiresquid:{ sizeCm:25, color:'#9BC7E0', draw:drawVampireSquid }, // ユウレイイカ
    hatchetfish: { sizeCm:14,  color:'#7EAFC6', draw:drawHatchetfish },  // デメエソ
    fireflysquid:{ sizeCm:12,  color:'#9BC7E0', draw:drawFireflySquid } // ホタルイカ
  };

  // --- 各生物のシルエット描画関数 ---
  // いずれもローカル座標(原点付近、概ね-20〜+20の範囲)で1体分を描く。
  // 色は暗めのトーンで統一し、クラゲと同じ発光斑点(glowDots)を後から重ねることでデザインを揃えている。

  function drawNautilus(time,c,col){ // オウムガイ:渦巻き状の殻+触手(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.1);
    ctx.strokeStyle = hexToRgba(col,0.65);
    ctx.lineWidth = 1/c.scale;
    ctx.beginPath(); ctx.arc(-4,0,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath();
    for(let a=0;a<=3.6*Math.PI;a+=0.25){
      const r = 1.2*Math.exp(0.16*a);
      const x = Math.cos(a)*r - 4, y = Math.sin(a)*r;
      if(a===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.lineWidth = 0.7/c.scale;
    for(let i=0;i<5;i++){
      const yy = -4+i*2;
      const tipX = 20+Math.sin(time*2+i+c.phase)*2, tipY = yy+Math.sin(time*2+i)*1.5;
      const midX = 16+Math.sin(time*2.3+i+c.phase)*1.5, midY = yy+Math.sin(time*1.7+i)*1;
      ctx.beginPath();
      ctx.moveTo(12,yy);
      ctx.quadraticCurveTo(midX,midY,tipX,tipY);
      ctx.stroke();
    }
  }

  function drawDumbo(time,c,col){ // メンダコ:丸い胴体+大きな耳びれ+短い足(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.12);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath(); ctx.ellipse(0,-1,11,9,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    const flap = Math.sin(time*3+c.phase)*0.35;
    ctx.save(); ctx.translate(-9,-3); ctx.rotate(flap);
    ctx.beginPath(); ctx.ellipse(0,0,8,4.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(9,-3); ctx.rotate(-flap);
    ctx.beginPath(); ctx.ellipse(0,0,8,4.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.lineWidth = 0.8/c.scale; ctx.lineCap = 'round';
    for(let i=0;i<6;i++){
      const bx = -8+i*3.2;
      ctx.beginPath(); ctx.moveTo(bx,6);
      ctx.quadraticCurveTo(bx+Math.sin(time*1.6+i+c.phase)*2,10, bx+Math.sin(time*1.6+i+c.phase)*3, 14);
      ctx.stroke();
    }
  }

  function drawSeaCucumber(time,c,col){ // ナマコ:細長い胴体+管足の突起(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.12);
    ctx.strokeStyle = hexToRgba(col,0.55);
    ctx.lineWidth = 0.9/c.scale;
    const bend = Math.sin(time*0.5+c.phase)*2;
    ctx.beginPath();
    ctx.moveTo(-15,0);
    ctx.quadraticCurveTo(-6,-7+bend,4,-6);
    ctx.quadraticCurveTo(12,-5,15,0);
    ctx.quadraticCurveTo(8,6,-2,6+bend);
    ctx.quadraticCurveTo(-10,6,-15,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexToRgba(col,0.4);
    ctx.lineWidth = 0.6/c.scale;
    for(let i=-10;i<=10;i+=5){
      ctx.beginPath(); ctx.arc(i,5,1.2,0,Math.PI*2); ctx.stroke();
    }
  }

  function drawBarreleye(time,c,col){ // デメニギス:半透明ドームの中に上向きの発光する目(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.11);
    ctx.strokeStyle = hexToRgba(col,0.55);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath(); ctx.ellipse(-3,3,11,5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    const finWig = Math.sin(time*2+c.phase)*1;
    ctx.beginPath();
    ctx.moveTo(-13,3);
    ctx.quadraticCurveTo(-18,-4,-20,-1+finWig);
    ctx.quadraticCurveTo(-17,3,-20,7+finWig);
    ctx.quadraticCurveTo(-18,8,-13,3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = hexToRgba(col,0.08);
    ctx.beginPath(); ctx.arc(6,-1,7,0,Math.PI*2); ctx.fill();
    ctx.lineWidth = 0.7/c.scale;
    ctx.beginPath(); ctx.arc(6,-1,7,0,Math.PI*2); ctx.stroke();
    const blink = 0.6+0.4*Math.sin(time*1.5+c.phase);
    ctx.fillStyle = hexToRgba('#9BC7E0',0.8*blink);
    ctx.shadowColor = '#9BC7E0'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(4,-3,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-3,2,0,Math.PI*2); ctx.fill();
  }

  // ダイオウグソクムシ:直線区切りの楕円だと無機質に見えるため、
  // 重なり合う節(プレート)の連なりで曲線的な体を作り、脚や触角も曲線で揺らめかせて生命感を出す
  function drawIsopod(time,c,col){
    ctx.fillStyle = hexToRgba(col,0.13);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    const segs = 7;
    const bodyLen = 30, bodyHalfW = 7.5;
    const wave = Math.sin(time*0.7+c.phase)*0.8; // ゆっくり体をくねらせる

    // 頭から尾へ、重なり合う節(プレート)を弧を描くように並べて曲線的な胴体にする
    for(let i=0;i<segs;i++){
      const frac = i/(segs-1); // 0=頭 1=尾
      const segX = -bodyLen*0.5 + frac*bodyLen;
      const taper = Math.sin(frac*Math.PI); // 頭と尾を細く、中央を太く
      const segH = Math.max(2.2, bodyHalfW*taper);
      const segY = Math.sin(frac*Math.PI*1.4 + wave)*1.4; // 体節ごとにわずかに上下してうねりを出す
      ctx.beginPath();
      ctx.ellipse(segX, segY, bodyLen/segs*0.72, segH, 0, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
    // 尾端の小さな尾扇
    ctx.beginPath();
    ctx.moveTo(bodyLen*0.5-2, 0);
    ctx.quadraticCurveTo(bodyLen*0.5+3,-5, bodyLen*0.5+6, 0);
    ctx.quadraticCurveTo(bodyLen*0.5+3,5, bodyLen*0.5-2, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 脚:曲線で揺らめかせ、機械的な直線を避ける
    ctx.lineWidth = 0.7/c.scale;
    ctx.strokeStyle = hexToRgba(col,0.45);
    for(let i=0;i<7;i++){
      const frac = i/6;
      const legX = -bodyLen*0.42 + frac*bodyLen*0.85;
      const taper = Math.sin(frac*Math.PI);
      const legBaseY = Math.max(2, bodyHalfW*taper)*0.85;
      const wig = Math.sin(time*2.4+i+c.phase)*1.6;
      ctx.beginPath();
      ctx.moveTo(legX, legBaseY);
      ctx.quadraticCurveTo(legX+wig*0.6, legBaseY+5, legX+wig, legBaseY+8.5);
      ctx.stroke();
    }
    // 触角:頭の先からゆらゆらと伸びる曲線
    const antWig = Math.sin(time*1.8+c.phase)*2;
    ctx.beginPath();
    ctx.moveTo(-bodyLen*0.5,-1);
    ctx.quadraticCurveTo(-bodyLen*0.5-6, -4+antWig, -bodyLen*0.5-11, -2+antWig*0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-bodyLen*0.5,1);
    ctx.quadraticCurveTo(-bodyLen*0.5-6, 4-antWig, -bodyLen*0.5-11, 2-antWig*0.6);
    ctx.stroke();
  }

  function drawAnglerfish(time,c,col){ // アンコウ:丸い胴体+大きな口+発光ルアー(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.13);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath(); ctx.ellipse(-2,0,13,10,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(11,18,26,0.35)';
    ctx.beginPath();
    ctx.moveTo(8,-3); ctx.quadraticCurveTo(15,0,8,7); ctx.quadraticCurveTo(4,2,8,-3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234,246,255,0.4)'; ctx.lineWidth = 0.7/c.scale;
    for(let i=0;i<4;i++){
      const yy = -2+i*2.5;
      ctx.beginPath(); ctx.moveTo(8+i,yy); ctx.lineTo(11+i,yy+1); ctx.stroke();
    }
    ctx.strokeStyle = hexToRgba(col,0.55); ctx.lineWidth = 0.8/c.scale;
    ctx.beginPath();
    ctx.moveTo(2,-9); ctx.quadraticCurveTo(12,-20,9,-25);
    ctx.stroke();
    ctx.fillStyle = hexToRgba('#9BC7E0', 0.7+0.3*Math.sin(time*2+c.phase));
    ctx.shadowColor = '#9BC7E0'; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(9,-25,2,0,Math.PI*2); ctx.fill();
  }

  function drawDeepShrimp(time,c,col){ // オキナエビ:本体+尾びれ+長い触角+脚(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.14);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath();
    ctx.moveTo(-16,0);
    ctx.quadraticCurveTo(-9,-12,5,-9);
    ctx.quadraticCurveTo(15,-5,17,2);
    ctx.quadraticCurveTo(8,5,-5,7);
    ctx.quadraticCurveTo(-14,6,-16,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16,0);
    ctx.quadraticCurveTo(-21,-6,-24,-5);
    ctx.quadraticCurveTo(-22,-1,-22,2);
    ctx.quadraticCurveTo(-22,5,-24,5);
    ctx.quadraticCurveTo(-21,4,-16,3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.7/c.scale;
    const wig = Math.sin(time*2+c.phase)*4;
    ctx.beginPath(); ctx.moveTo(15,-5); ctx.quadraticCurveTo(26,-13+wig,34,-9+wig); ctx.stroke();
    for(let i=0;i<3;i++){
      const lx = -9+i*7;
      const legWig = Math.sin(time*3+i+c.phase)*2;
      ctx.beginPath(); ctx.moveTo(lx,6);
      ctx.quadraticCurveTo(lx+legWig*0.6,8.5, lx+legWig,11);
      ctx.stroke();
    }
  }

  function drawChimaera(time,c,col){ // ギンザメ:紡錘形の胴体+細長い鞭状の尾+背びれの棘(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.13);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath();
    ctx.moveTo(12,0);
    ctx.quadraticCurveTo(6,-8,-6,-4);
    ctx.quadraticCurveTo(-2,0,-6,4);
    ctx.quadraticCurveTo(6,8,12,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.8/c.scale; ctx.lineCap = 'round';
    const sway = Math.sin(time*1.2+c.phase)*3;
    ctx.beginPath();
    ctx.moveTo(-6,0);
    ctx.quadraticCurveTo(-16,2+sway,-26,sway*0.5);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(col,0.5);
    ctx.beginPath();
    ctx.moveTo(-3,-4);
    ctx.quadraticCurveTo(-2,-9,-1,-11);
    ctx.quadraticCurveTo(0,-9,2,-4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(234,246,255,0.5)';
    ctx.beginPath(); ctx.arc(9,-1,1.6,0,Math.PI*2); ctx.fill();
  }

  function drawYetiCrab(time,c,col){ // ユノハナガニ:小さな甲羅+ふさふさした2本のはさみ+脚(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.14);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.8/c.scale;
    ctx.beginPath(); ctx.ellipse(0,0,7,5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.7/c.scale;
    for(let i=0;i<3;i++){
      const yy = -4+i*4;
      const wigL = Math.sin(time*3+i+c.phase)*1.5;
      ctx.beginPath(); ctx.moveTo(-6,yy);
      ctx.quadraticCurveTo(-9,yy+1, -12+wigL, yy+3);
      ctx.stroke();
      const wigR = Math.sin(time*3+i+c.phase+1)*1.5;
      ctx.beginPath(); ctx.moveTo(6,yy);
      ctx.quadraticCurveTo(9,yy+1, 12+wigR, yy+3);
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(col,0.3);
    ctx.beginPath(); ctx.ellipse(-9,-5,3,2,0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(9,-5,3,2,-0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // はさみのふさふさした毛を、短い曲線を数本添えて表現する
    ctx.lineWidth = 0.5/c.scale;
    for(let i=0;i<3;i++){
      const bristleWig = Math.sin(time*2.5+i+c.phase)*0.8;
      ctx.beginPath();
      ctx.moveTo(-11+i,-6);
      ctx.quadraticCurveTo(-13+i+bristleWig,-8, -12+i+bristleWig,-9.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(11-i,-6);
      ctx.quadraticCurveTo(13-i-bristleWig,-8, 12-i-bristleWig,-9.5);
      ctx.stroke();
    }
  }

  function drawViperfish(time,c,col){ // ホウライエソ:細長い体+牙+発光する長い背びれの糸(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.13);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath();
    ctx.moveTo(-16,0);
    ctx.quadraticCurveTo(-4,-6,10,-2);
    ctx.quadraticCurveTo(4,0,10,2);
    ctx.quadraticCurveTo(-4,6,-16,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(234,246,255,0.5)'; ctx.lineWidth = 0.6/c.scale;
    for(let i=0;i<3;i++){
      ctx.beginPath(); ctx.moveTo(8-i*1.5,-2+i); ctx.lineTo(11-i*1.5,0+i); ctx.stroke();
    }
    ctx.strokeStyle = hexToRgba(col,0.55); ctx.lineWidth = 0.8/c.scale;
    ctx.beginPath();
    ctx.moveTo(-2,-4); ctx.quadraticCurveTo(2,-16,10,-14);
    ctx.stroke();
    ctx.fillStyle = hexToRgba('#9BC7E0', 0.7+0.3*Math.sin(time*2.4+c.phase));
    ctx.shadowColor = '#9BC7E0'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(10,-14,1.8,0,Math.PI*2); ctx.fill();
  }

  function drawGulperEel(time,c,col){ // フクロウナギ:巨大な袋状の口+細く長い鞭状の体+尾端の発光(細い線+淡い塗り)
    ctx.fillStyle = hexToRgba(col,0.12);
    ctx.strokeStyle = hexToRgba(col,0.55);
    ctx.lineWidth = 0.9/c.scale;
    const wig = Math.sin(time*0.8+c.phase)*3;
    ctx.beginPath();
    ctx.moveTo(-30,wig*0.3);
    ctx.quadraticCurveTo(-10,-2+wig*0.6,2,-8);
    ctx.quadraticCurveTo(12,-4,13,0);
    ctx.quadraticCurveTo(12,8,2,7);
    ctx.quadraticCurveTo(-10,4+wig*0.6,-30,wig*0.3+2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(234,246,255,0.4)';
    ctx.beginPath(); ctx.arc(-2,-2,1.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = hexToRgba('#8FD1F0', 0.7+0.3*Math.sin(time*2+c.phase));
    ctx.shadowColor = '#8FD1F0'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-30,wig*0.3+1,1.6,0,Math.PI*2); ctx.fill();
  }

  function drawGiantSquid(time,c,col){ // ダイオウイカ:胴体+矢羽根状の尾びれ+頭部+腕の束+2本の長い触腕
    ctx.fillStyle = hexToRgba(col,0.12);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    // 胴体・尾びれ・頭部を1本の輪郭としてつなげて描く。
    // 尾側は、左右に張り出す2枚のひれと中央の尖った先端をまとめて
    // 矢羽根(紙飛行機の先端)のような1つの形にし、本体と地続きにしている。
    ctx.beginPath();
    ctx.moveTo(-34,0);                   // 尾の最も尖った先端
    ctx.quadraticCurveTo(-30,-9,-26,-9);  // 上側のひれの張り出し
    ctx.quadraticCurveTo(-20,-8,-16,-6);  // ひれから胴体上部へ合流
    ctx.quadraticCurveTo(-8,-6.5,-2,-6);  // 胴体上部
    ctx.quadraticCurveTo(3,-6,6,-4.2);       // 頭部にかけてのくびれ
    ctx.quadraticCurveTo(8.5,-4.3,9.7,-3.5); // 側面をほぼ平行に保つ(円柱の側面のように)
    ctx.quadraticCurveTo(11.6,-2.2,11.6,0);  // 丸い先端(半円状のキャップ)
    ctx.quadraticCurveTo(11.6,2.2,9.7,3.5);
    ctx.quadraticCurveTo(8.5,4.3,6,4.2);
    ctx.quadraticCurveTo(3,6,-2,6);
    ctx.quadraticCurveTo(-8,6.5,-16,6);
    ctx.quadraticCurveTo(-20,8,-26,9);    // 下側のひれの張り出し
    ctx.quadraticCurveTo(-30,9,-34,0);    // 尾の先端へ戻る
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 頭部と胴体の境目を示す、襟のような細い線
    ctx.lineWidth = 0.5/c.scale;
    ctx.strokeStyle = hexToRgba(col,0.35);
    ctx.beginPath();
    ctx.moveTo(4,-5);
    ctx.quadraticCurveTo(7,0,4,5);
    ctx.stroke();
    // 目(左右2つに戻す)
    ctx.fillStyle = hexToRgba(col,0.4);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.6/c.scale;
    ctx.beginPath(); ctx.arc(6,-2.2,1.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(6,2.2,1.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // 頭部の先端に直線状に並んだ8か所の生え際から伸びる、絡み合いながら束になった腕
    ctx.lineWidth = 0.6/c.scale;
    for(let i=0;i<8;i++){
      const baseX = 10.5, baseY = -4 + i*(8/7); // 円柱状の先端の縁に沿って直線状に並ぶ8つの生え際
      const ang = -0.75+i*(1.5/7);
      const armLen = 11+ (i%3)*2.5;
      const wig = Math.sin(time*1.7+i+c.phase)*1.3;
      const midX = baseX+Math.cos(ang)*7, midY = baseY+Math.sin(ang)*7+wig*0.3;
      const tipX = baseX+Math.cos(ang)*armLen, tipY = baseY+Math.sin(ang)*armLen+wig;
      const curlAng = ang+0.7;
      const curlX = tipX+Math.cos(curlAng)*2.2, curlY = tipY+Math.sin(curlAng)*2.2;
      ctx.beginPath();
      ctx.moveTo(baseX,baseY);
      ctx.quadraticCurveTo(midX,midY,tipX,tipY);
      ctx.quadraticCurveTo((tipX+curlX)/2,(tipY+curlY)/2,curlX,curlY);
      ctx.stroke();
    }
    // 先端に木の葉状のパドル(吸盤クラブ)を持つ、2本の長い触腕
    ctx.lineWidth = 0.55/c.scale;
    for(let s=-1;s<=1;s+=2){
      const wig = Math.sin(time*1.3+c.phase+s)*4;
      const midX=20, midY=s*5+wig*0.5;
      const tipX=34, tipY=s*3+wig;
      ctx.beginPath();
      ctx.moveTo(10.5, s*1.5);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
      // パドル状のクラブを、触腕の伸びる向きに合わせて配置
      const approachAng = Math.atan2(tipY-midY, tipX-midX);
      ctx.save();
      ctx.translate(tipX,tipY);
      ctx.rotate(approachAng);
      ctx.beginPath();
      ctx.moveTo(-3,0);
      ctx.quadraticCurveTo(-1,-1.6,2.5,0);
      ctx.quadraticCurveTo(-1,1.6,-3,0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawVampireSquid(time,c,col){ // ユウレイイカ:ベル状のゼラチン質の体+膜でつながった腕+小さなひれ
    ctx.fillStyle = hexToRgba(col,0.14);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.9/c.scale;
    ctx.beginPath();
    ctx.moveTo(-9,-8);
    ctx.quadraticCurveTo(-11,2,-6,9);
    ctx.quadraticCurveTo(0,12,6,9);
    ctx.quadraticCurveTo(11,2,9,-8);
    ctx.quadraticCurveTo(0,-12,-9,-8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    const finFlap = Math.sin(time*2.2+c.phase)*0.3;
    ctx.save(); ctx.translate(-7,-6); ctx.rotate(finFlap);
    ctx.beginPath(); ctx.ellipse(0,0,4,2.4,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(7,-6); ctx.rotate(-finFlap);
    ctx.beginPath(); ctx.ellipse(0,0,4,2.4,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    // マント下端から伸びる、膜でつながったような8本の腕
    ctx.lineWidth = 0.6/c.scale;
    const armBaseY = 8;
    for(let i=0;i<8;i++){
      const frac = (i-3.5)/3.5;
      const baseX = frac*7;
      const wig = Math.sin(time*1.6+i+c.phase)*2;
      ctx.beginPath();
      ctx.moveTo(baseX,armBaseY);
      ctx.quadraticCurveTo(baseX*1.4+wig*0.5, armBaseY+9, baseX*1.6+wig, armBaseY+15);
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(col,0.4);
    ctx.beginPath(); ctx.arc(-3,-2,2,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(3,-2,2,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }

  function drawHatchetfish(time,c,col){ // デメエソ:平たいハチェット型の体+上向きの目+腹側の発光器の列
    ctx.fillStyle = hexToRgba(col,0.14);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.8/c.scale;
    ctx.beginPath();
    ctx.moveTo(-4,-9);
    ctx.quadraticCurveTo(6,-9,10,-2);
    ctx.quadraticCurveTo(11,0,10,2);
    ctx.quadraticCurveTo(4,6,-6,5);
    ctx.quadraticCurveTo(-10,3,-9,-3);
    ctx.quadraticCurveTo(-8,-8,-4,-9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.6/c.scale;
    const wig = Math.sin(time*3+c.phase)*2;
    ctx.beginPath();
    ctx.moveTo(-6,1);
    ctx.quadraticCurveTo(-12,0+wig*0.4,-16,wig);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(col,0.4);
    ctx.beginPath(); ctx.arc(2,-4,2.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // 腹側に並ぶ発光器(デメエソの特徴的なカウンターイルミネーション)
    const dotBlink = 0.5+0.5*Math.sin(time*1.4+c.phase);
    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.arc(-4+i*3, 4+Math.sin(i)*0.5, 0.6, 0, Math.PI*2);
      ctx.fillStyle = hexToRgba('#9BC7E0', 0.6*dotBlink);
      ctx.shadowColor = '#9BC7E0'; ctx.shadowBlur = 4;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawFireflySquid(time,c,col){ // ホタルイカ:小さな胴体全体に散りばめられた無数の発光点
    ctx.fillStyle = hexToRgba(col,0.14);
    ctx.strokeStyle = hexToRgba(col,0.6);
    ctx.lineWidth = 0.8/c.scale;
    ctx.beginPath();
    ctx.moveTo(-10,0);
    ctx.quadraticCurveTo(-8,-4,0,-4);
    ctx.quadraticCurveTo(7,-3,9,0);
    ctx.quadraticCurveTo(7,3,0,4);
    ctx.quadraticCurveTo(-8,4,-10,0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.6/c.scale;
    ctx.beginPath();
    ctx.moveTo(-6,-3.5);
    ctx.quadraticCurveTo(-10,-7,-12,-3);
    ctx.quadraticCurveTo(-9,-2,-6,-3.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6,3.5);
    ctx.quadraticCurveTo(-10,7,-12,3);
    ctx.quadraticCurveTo(-9,2,-6,3.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.5/c.scale;
    for(let i=0;i<5;i++){
      const ang = -0.5+i*0.25;
      const wig = Math.sin(time*2+i+c.phase)*1;
      ctx.beginPath();
      ctx.moveTo(9,0);
      ctx.quadraticCurveTo(9+Math.cos(ang)*3,Math.sin(ang)*3+wig*0.3, 9+Math.cos(ang)*6,Math.sin(ang)*6+wig);
      ctx.stroke();
    }
    // 全身に散りばめられた小さな発光点(ホタルイカの最大の特徴)
    const spots = [[-6,-2],[-3,-3],[0,-2.5],[3,-2],[-6,2],[-3,3],[0,2.5],[3,2],[-1,0]];
    spots.forEach((p,idx)=>{
      const blink = 0.4+0.6*Math.max(0, Math.sin(time*1.6+idx+c.phase));
      ctx.beginPath();
      ctx.arc(p[0],p[1],0.7,0,Math.PI*2);
      ctx.fillStyle = hexToRgba('#9BC7E0', 0.7*blink);
      ctx.shadowColor = '#9BC7E0'; ctx.shadowBlur = 4;
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  // --- 生物の発生・移動・描画をまとめるロジック(マリンスノーとは別の配列/関数) ---
  const deepCreatures = [];

  // 深度に応じた出現間隔(秒)を計算する。
  // 単純なサインカーブではなく、余弦カーブ(0〜1)をsharpness乗して谷を広く・山を鋭くしている。
  // これにより「ほとんどの深度ではspawnIntervalMaxSec(低頻度)が続き、
  // 周期spawnPeakPeriodMごとに現れる狭い山の頂点だけspawnIntervalMinSec(高頻度)になる」
  // というカーブになる(spawnPeakPeriodM=5000なら深度10000mまでに山が2回)。
  function spawnIntervalForDepth(depth){
    const cfg = CONFIG.creatures;
    const raw = (1 - Math.cos(2*Math.PI*depth/cfg.spawnPeakPeriodM)) / 2; // 0〜1の滑らかな山谷
    const shaped = Math.pow(raw, cfg.spawnSharpness); // 山を鋭く、谷を広くする
    return cfg.spawnIntervalMaxSec - (cfg.spawnIntervalMaxSec - cfg.spawnIntervalMinSec) * shaped;
  }
  function trySpawnCreature(dt, depth){
    const cfg = CONFIG.creatures;
    if(depth < cfg.minDepthM) return; // 浅いうちは生物を出現させない
    if(Math.random() > dt/spawnIntervalForDepth(depth)) return;
    if(deepCreatures.length >= cfg.maxConcurrent) return;

    const keys = Object.keys(CREATURE_TYPES);
    const type = keys[Math.floor(Math.random()*keys.length)];
    const def = CREATURE_TYPES[type];
    // クラゲの実寸(cfg.jellyRealCm)とこの生物の実寸(sizeCm)の比率から、
    // 画面上での目標サイズ(px)を決める。クラゲの傘の直径(jelly.radius*2)を基準にしている。
    const targetPx = (def.sizeCm/cfg.jellyRealCm) * (jelly.radius*2);
    const varianceRange = cfg.scaleVarianceMax - cfg.scaleVarianceMin;
    const scale = (targetPx/cfg.unitSize) * (cfg.scaleVarianceMin+Math.random()*varianceRange); // 個体差を少し持たせる
    const riseSpeed = cfg.riseSpeedMinPxSec + Math.random()*(cfg.riseSpeedMaxPxSec-cfg.riseSpeedMinPxSec);
    const swaySpeed = cfg.swaySpeedMin + Math.random()*(cfg.swaySpeedMax-cfg.swaySpeedMin);
    const swayAmp = cfg.swayAmpMinPx + Math.random()*(cfg.swayAmpMaxPx-cfg.swayAmpMinPx);

    deepCreatures.push({
      type, scale,
      x: Math.random()*width,
      y: height + 60 + scale*20, // マリンスノーと同じく画面下から出現
      vy: -riseSpeed * (reducedMotion?0.5:1), // ゆっくり上へ流れる
      facing: Math.random()<0.5 ? 1 : -1,
      phase: Math.random()*10,
      swaySpeed, swayAmp,
      tiltPhase: Math.random()*10,          // 傾きの揺れの位相(横揺れとは別にずらし、ランダムな傾きに見せる)
      tiltSpeed: 0.12+Math.random()*0.22,   // 傾きが変化する速さの個体差
      tiltVariance: 0.6+Math.random()*0.8,  // 傾きの大きさの個体差
      glowDots: Array.from({length:2+Math.floor(Math.random()*3)}, ()=>({
        ox:(Math.random()-0.5)*16, oy:(Math.random()-0.5)*10,
        phase:Math.random()*10,
        color: DEEP_PALETTE[Math.floor(Math.random()*DEEP_PALETTE.length)]
      }))
    });
  }

  function updateCreatures(dt, time, depth){
    trySpawnCreature(dt, depth);
    for(let i=deepCreatures.length-1;i>=0;i--){
      const c = deepCreatures[i];
      c.y += c.vy*dt;                                          // マリンスノーと同じ:一定速度で上へ
      c.x += Math.sin(time*c.swaySpeed+c.phase)*c.swayAmp*dt;   // 左右にゆっくり漂う
      if(c.y < -200 - c.scale*20) deepCreatures.splice(i,1);    // 画面上端を十分に超えたら消す
    }
  }

  // 画面の上下端に近づくにつれて透明になるフェード計算(生物の大きさに応じて余白を調整)
  function creatureAlpha(c){
    const margin = 90 + c.scale*15;
    const bottomFade = Math.max(0, Math.min(1, (height+margin-c.y)/margin));
    const topFade = Math.max(0, Math.min(1, (c.y+margin*0.7)/(margin*0.7)));
    return Math.min(bottomFade, topFade);
  }

  function drawCreatures(time){
    const cfg = CONFIG.creatures;
    deepCreatures.forEach(c=>{
      const alpha = creatureAlpha(c);
      if(alpha<=0.01) return;
      const def = CREATURE_TYPES[c.type];
      ctx.save();
      ctx.translate(c.x, c.y);
      // クラゲと同じ考え方:複数の周期のサイン波を組み合わせて、機械的でないランダムな傾きを作る
      const tilt = (Math.sin(time*c.tiltSpeed + c.tiltPhase) * 0.6
                  + Math.sin(time*c.tiltSpeed*2.3 + c.tiltPhase*1.6) * 0.4)
                 * cfg.maxTiltRad * c.tiltVariance;
      ctx.rotate(tilt);
      ctx.scale(c.facing*c.scale, c.scale); // facingが-1のときは左右反転
      // 全体の不透明度をcfg.opacityで一段階落とし、輪郭も自分の体色でにじませることで、
      // 「線が太く色が強すぎて目立つ」状態から「淡く透明感のある」見た目にしている。
      ctx.globalAlpha = alpha * cfg.opacity;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = cfg.glowBlur;

      def.draw(time, c, def.color);

      ctx.shadowBlur = 0;
      c.glowDots.forEach(d=>{ // クラゲと同じ発光斑点をまとわせ、デザインを揃える
        const blink = 0.4+0.6*Math.max(0, Math.sin(time*1.3+d.phase));
        ctx.beginPath();
        ctx.arc(d.ox, d.oy, 1.3, 0, Math.PI*2);
        ctx.fillStyle = hexToRgba(d.color, 0.7*blink);
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 6;
        ctx.fill();
      });
      ctx.restore();
    });
  }

  // ---------- 背景の岩礁演出 ----------
  // ときおり、暗い岩礁(海山の尾根のようなシルエット)が画面の端から現れ、
  // 生物よりもさらにゆっくりと上へ抜けていく。深海の地形を感じさせるための背景演出。
  const rockFormations = [];

  // ギザギザした岩のシルエットを1つ生成する(生成時にランダムな形を1回だけ作り、以後は同じ形を使い回す)
  function makeRockShape(){
    const peaks = 5+Math.floor(Math.random()*3);
    const w = 120+Math.random()*100;
    const h = 180+Math.random()*140;
    const pts = [[-w*0.55,0]];
    for(let i=0;i<=peaks;i++){
      const frac = i/peaks;
      const x = -w*0.55 + frac*w*1.1;
      const y = -h*(0.35+Math.random()*0.65) * Math.sin(Math.PI*Math.min(1,frac+0.05));
      pts.push([x,y]);
    }
    pts.push([w*0.55,0]);
    return pts;
  }

  // 平均CONFIG.rocks.spawnIntervalSec秒に1回程度、画面の左右どちらかの端寄りに岩礁を出現させる(中央のクラゲとは重ならないように)
  function trySpawnRock(dt){
    const cfg = CONFIG.rocks;
    if(Math.random() > dt/cfg.spawnIntervalSec) return;
    if(rockFormations.length >= cfg.maxConcurrent) return; // 背景の演出なので同時出現数は控えめ
    const xFrac = Math.random()<0.5 ? 0.15+Math.random()*0.12 : 0.73+Math.random()*0.12;
    const riseSpeed = cfg.riseSpeedMinPxSec + Math.random()*(cfg.riseSpeedMaxPxSec-cfg.riseSpeedMinPxSec);
    rockFormations.push({
      shape: makeRockShape(),
      x: width*xFrac,
      y: height + 120,
      vy: -riseSpeed, // 生物よりゆっくり
      scale: 0.85+Math.random()*0.5,
      glowDots: Array.from({length:3+Math.floor(Math.random()*3)}, ()=>({ // 熱水噴出孔の生き物のような発光の点在
        ox:(Math.random()-0.5)*140, oy:-Math.random()*160,
        phase:Math.random()*10,
        color: DEEP_PALETTE[Math.floor(Math.random()*DEEP_PALETTE.length)]
      }))
    });
  }

  function updateRocks(dt){
    trySpawnRock(dt);
    for(let i=rockFormations.length-1;i>=0;i--){
      const r = rockFormations[i];
      r.y += r.vy*dt;
      if(r.y < -height*0.9) rockFormations.splice(i,1);
    }
  }

  function rockAlpha(r){
    const margin = 260;
    const bottomFade = Math.max(0, Math.min(1, (height+margin-r.y)/margin));
    const topFade = Math.max(0, Math.min(1, (r.y+height*0.5)/(height*0.5)));
    return Math.min(bottomFade, topFade) * 0.85; // 背景要素なので少し控えめな濃さに
  }

  function drawRocks(time){
    rockFormations.forEach(r=>{
      const alpha = rockAlpha(r);
      if(alpha<=0.01) return;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(r.scale, r.scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgb(5,11,19)';
      ctx.beginPath();
      r.shape.forEach(([px,py],i)=>{ if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexToRgba(jelly.glowColor, 0.06); // 縁にわずかな縁取り(リムライト)
      ctx.lineWidth = 2;
      ctx.stroke();
      r.glowDots.forEach(d=>{ // 熱水噴出孔まわりの生き物を思わせる小さな発光
        const blink = 0.4+0.6*Math.max(0, Math.sin(time*1.05+d.phase));
        ctx.beginPath();
        ctx.arc(d.ox, d.oy, 1.8, 0, Math.PI*2);
        ctx.fillStyle = hexToRgba(d.color, 0.6*blink);
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 7;
        ctx.fill();
      });
      ctx.restore();
    });
  }

  // ---------- 深度ゾーン名の表示 ----------
  // 実際の海洋区分をもとにした、深度に応じたゾーン名
  const zones = [
    {max:200,      ja:'有光層', en:'EPIPELAGIC ZONE'},
    {max:1000,     ja:'中深層', en:'MESOPELAGIC ZONE'},
    {max:4000,     ja:'漸深層', en:'BATHYPELAGIC ZONE'},
    {max:6000,     ja:'深海層', en:'ABYSSOPELAGIC ZONE'},
    {max:Infinity, ja:'超深海層', en:'HADOPELAGIC ZONE'}
  ];
  let currentZoneIdx = -1;   // 直近に判定されたゾーンの番号
  let pendingZoneIdx = null; // 導入テキストが消えるまで、表示を保留中のゾーン番号
  let zoneTimer = null;

  // 中央にゾーン名をフェードインさせ、しばらくしてから
  // 中央をフェードアウトさせつつ右下の常時表示ラベルをフェードインさせる
  function showZoneAnnounce(idx){
    const z = zones[idx];
    zoneAnnounceJaEl.textContent = z.ja;
    zoneAnnounceEnEl.textContent = z.en;
    zoneCornerJaEl.textContent = z.ja;
    zoneCornerEnEl.textContent = z.en;

    zoneAnnounceEl.classList.add('show');
    if(zoneTimer) clearTimeout(zoneTimer);
    zoneTimer = setTimeout(()=>{
      zoneAnnounceEl.classList.remove('show');
      zoneCornerEl.classList.add('show');
    }, 3800);
  }

  function updateZoneLabel(depth){
    let idx = zones.findIndex(z=>depth<z.max);
    if(idx===-1) idx = zones.length-1;
    if(idx !== currentZoneIdx){
      currentZoneIdx = idx;
      // 導入テキストがまだ表示されている間は、ゾーン名の表示を重ねないように保留する
      if(zoneUiReady) showZoneAnnounce(idx);
      else pendingZoneIdx = idx;
    }
    // 導入テキストが消え終わったタイミングで、保留していたゾーン名を表示する
    if(zoneUiReady && pendingZoneIdx !== null){
      showZoneAnnounce(pendingZoneIdx);
      pendingZoneIdx = null;
    }
  }

  // ---------- 導入テキストの制御 ----------
  let introHidden = false;
  // 導入テキストのフェードアウトが完全に終わってから true になるフラグ。
  // これが true になるまでは、ゾーン名(有光層など)の表示を待たせる。
  let zoneUiReady = false;
  function hideIntro(){
    if(introHidden) return;
    introHidden = true;
    introEl.classList.add('hide');
    // style.css の .intro { transition: opacity 2s ease } と同じ2秒後に「表示OK」にする
    setTimeout(()=>{ zoneUiReady = true; }, 2000);
  }
  setTimeout(hideIntro, 7000); // タップしなくても7秒後には自動的に消える

  // ---------- 入力(タップ/クリック)処理 ----------
  // マウスのclientX/Yとタッチのtouches[0]の両方に対応した座標取得
  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return {x:cx, y:cy};
  }
  canvas.addEventListener('pointerdown', function(e){
    const p = getPos(e);
    hideIntro(); // どこをタップしても導入テキストは消える
    if(pointInJelly(p.x,p.y)) triggerReaction(); // クラゲの上だけ反応する
  });
  canvas.addEventListener('pointermove', function(e){
    const p = getPos(e);
    canvas.style.cursor = pointInJelly(p.x,p.y) ? 'pointer' : 'default';
  });

  // ---------- リサイズ対応 ----------
  function resize(){
    // devicePixelRatioに合わせて実ピクセル数を増やし、Retinaディスプレイでもぼやけないようにする
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width*dpr;
    canvas.height = height*dpr;
    canvas.style.width = width+'px';
    canvas.style.height = height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    jelly.baseX = width/2;
    jelly.baseY = height*0.36; // 画面のやや上寄りが定位置
    jelly.x = jelly.baseX;
    jelly.y = jelly.baseY;
    initParticles();
  }
  window.addEventListener('resize', resize);
  resize(); // 初回実行

  // ---------- メインループ ----------
  let last = performance.now();
  const startTime = last; // アプリを開いた瞬間の時刻。深度計算の基準にする
  let time = 0; // アニメーション用の経過秒数(タブが非アクティブでも大きく飛ばないようclampされる)

  function frame(now){
    const dt = Math.min(0.05, (now-last)/1000); // 1フレームあたりの経過秒数(最大50msに制限)
    last = now;
    time += dt;
    const depth = ((now - startTime)/1000) * CONFIG.descentSpeedMps; // 経過秒数 × 沈下速度

    updateParticles(dt, time);
    updateJellyDrift(time);
    if(CONFIG.rocks.enabled) updateRocks(dt);
    if(CONFIG.creatures.enabled) updateCreatures(dt, time, depth);
    updateFx(dt);

    // depthをそのまま使わず exp() で圧縮した t (0〜1) を、背景の暗さなどの見た目に使う。
    // これにより、実際の海洋スケールでは何百mも必要な変化を、体感として早めに味わえる。
    const t = 1 - Math.exp(-depth/900);
    drawBackground(t);
    drawLightBeams(t, time);
    if(CONFIG.rocks.enabled) drawRocks(time); // 岩礁は背景寄りのレイヤーとして粒子・生物より先に描く
    drawParticles(time);
    if(CONFIG.creatures.enabled) drawCreatures(time);
    drawJellyfish(time);
    drawFx();

    depthValueEl.textContent = depth.toFixed(1);
    updateZoneLabel(depth);
    document.documentElement.style.setProperty('--vignette-strength', (0.25+t*0.35).toFixed(3));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
