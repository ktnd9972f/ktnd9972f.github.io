import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';


let camera, scene, renderer;
let MessageList = [];
let TextObjectList = [];



init();

function update3DBlock(h, w, d, st){
    
    const height = h;
    const width = w;
    const depth = d;
    const text_string = st;

    const group = new THREE.Group();

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf8f9fa );
    scene.add(group);
    
    
    // 立方体のジオメトリを作成
    const block_size = 200;
    const cube_geometry = new THREE.BoxGeometry(block_size, block_size, block_size);

    // 面のマテリアルを設定
    let surface_materials = [];
    const surface_colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff, 0x88ff00, 0x0088ff, 0xff0088, 0x8800ff];
    for (let i = 0; i < depth; i++) {
        surface_materials.push(new THREE.MeshBasicMaterial({ color: surface_colors[i%surface_colors.length], transparent: true, opacity: 0.1 }));
    }

    // 辺（エッジ）用のマテリアルとジオメトリを作成
    const edges = new THREE.EdgesGeometry(cube_geometry);
    let line_materials = [];
    const line_colors = [0x440000, 0x004400, 0x000044, 0x444400, 0x004444, 0x440044, 0x224400, 0x002244, 0x440022, 0x220044];
    for (let i = 0; i < depth; i++) {
        line_materials.push(new THREE.LineBasicMaterial({ color: line_colors[i%line_colors.length] }));
    }

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            for (let k = 0; k < depth; k++) {
                //立方体のメッシュを作成
                const tmp_cube_mesh = new THREE.Mesh(cube_geometry, surface_materials[k]);
                tmp_cube_mesh.position.set(block_size*i, block_size*j, block_size*k);
                group.add(tmp_cube_mesh);

                const tmp_edge_mesh = new THREE.LineSegments(edges, line_materials[k]);
                tmp_edge_mesh.position.set(block_size*i, block_size*j, block_size*k);
                group.add(tmp_edge_mesh);
            }
        }
    }

    const loader = new FontLoader();
    loader.load( 'fonts/M_PLUS_1_Code_Regular.json', function ( font ) {

        const font_colors = [0x990000, 0x009900, 0x000099, 0x999900, 0x009999, 0x990099, 0x669900, 0x006699, 0x990066, 0x660099];
        const font_materials = []
        for (let i = 0; i < depth; i++) {
            font_materials.push(new THREE.MeshBasicMaterial( {
                color: font_colors[i%font_colors.length],
                transparent: true,
                opacity: 0.5,
                side: THREE.FrontSide,
                //side: THREE.DoubleSide  //常にカメラに向けるならばFrontSideでよい
                depthTest: false          //カメラ位置に関わらず文字を常に描画
            } ));
        }
        MessageList.length = height*width*depth;

        for (let i = 0; i < width; i++) {
            MessageList[i] = [];
            for (let j = 0; j < height; j++) {
                MessageList[i][j] = [];
                for (let k = 0; k < depth; k++) {
                    MessageList[i][j][k] = '';
                }
            }
        }

        let cnt1 = 0;
        for (let k = 0; k < depth; k++) {
            for (let j = 0; j < height; j++) {
                for (let i = 0; i < width; i++) {
                    if(cnt1 < text_string.length){
                        MessageList[width-1-i][height-1-j][k] = text_string[cnt1];
                    }
                    cnt1++;
                }
            }
        }
        let cnt = 0;
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                for (let k = 0; k < depth; k++) {
                    if(MessageList[i][j][k] != ''){

                        const shapes = font.generateShapes( MessageList[i][j][k], 100 );
                        const font_geometry = new THREE.ShapeGeometry( shapes );
                        font_geometry.computeBoundingBox();
                        const xMid = - 0.5 * ( font_geometry.boundingBox.max.x - font_geometry.boundingBox.min.x );
                        const yMid = - 0.5 * ( font_geometry.boundingBox.max.y - font_geometry.boundingBox.min.y );
                        font_geometry.translate( xMid, yMid, 1 );

                        TextObjectList.push(new THREE.Mesh( font_geometry, font_materials[k] ));
                        TextObjectList[cnt].position.set(block_size*i+5, block_size*j+5, block_size*k+5);
                        group.add( TextObjectList[cnt] );
                        cnt++;

                    }
                }
            }
        }
        render();
    } );

}

function init( ) {
    // Three.jsを描画するためのdiv要素
    const container = document.getElementById('BlocksContainer');

    const default_height = 4;
    const default_width = 3;
    const default_depth = 4;
    const default_string = "いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑいもせすん";
    update3DBlock(default_height, default_width, default_depth, default_string);

    //カメラ設定
    let default_render_width = 800;
    let default_render_height = 800;
    let setting_render_width = default_render_width;
    let setting_render_height = default_render_height;
    if(default_render_width > window.innerWidth*0.80){
        setting_render_width = window.innerWidth*0.80;
    }
    //camera = new THREE.PerspectiveCamera( 45, window.innerWidth  / window.innerHeight, 1, 10000 );
    camera = new THREE.PerspectiveCamera( 45, setting_render_width / setting_render_height, 1, 10000 );
    camera.position.set( -880, 340, -1200 );
    renderer = new THREE.WebGLRenderer( { 
        antialias: true,
    } );
    renderer.setPixelRatio( container.devicePixelRatio );
    //renderer.setSize( window.innerWidth/2 , window.innerHeight/2 );
    renderer.setSize( setting_render_width, setting_render_height );
    container.appendChild( renderer.domElement );
    const controls = new OrbitControls( camera, renderer.domElement );
    // 滑らかにカメラコントローラーを制御する
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.target.set( 100, 200, 0 );
    controls.update();


    controls.addEventListener( 'change', render );

        
    /*
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth/2, window.innerHeight/2);
        console.log(window.innerWidth); //★
        console.log(window.innerHeight ); //★
        console.log("window resize");
    });
    */
}

function render() {
    // テキストがカメラに正対するように設定
    for (let i = 0; i < TextObjectList.length; i++) {
        TextObjectList[i].lookAt(camera.position);
    }
    
    renderer.render( scene, camera );

}


function clearScene() {
    if (!scene) return;
    // シーン内のすべてのオブジェクトを取得
    scene.children.forEach((object) => {
        if (object.isMesh) {
            // メッシュオブジェクトの場合、ジオメトリとマテリアルを解放
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                // マテリアルが配列の場合、個別に解放
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
        // シーンから削除
        scene.remove(object);
    });

    //オブジェクトリストを削除
    TextObjectList.splice(0);
}

export function setParameters(h, w, d, st){
    clearScene();
    update3DBlock(h, w, d, st);
}

window.setParameters = setParameters;