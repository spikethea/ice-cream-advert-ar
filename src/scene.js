import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as ZapparThree from "@zappar/zappar-threejs";
import ZapparSharing from '@zappar/sharing';
import gsap from 'gsap'

// Objects
import iceCreamURL from './assets/meshes/ice_cream_2.glb';

//Textures
import defaultTexture from './assets/images/default__texture.png';
import mangoTexture from './assets/images/mango__texture.png';
import pistachioTexture from './assets/images/pistachio__texture.png';
import strawberryTexture from './assets/images/strawberry__texture.png';

//SVG
import pistachioIcon from './assets/images/pistachio-icon.svg';
import strawberryIcon from './assets/images/strawberry-icon.svg';
import mangoIcon from './assets/images/mango-icon.svg';


export default function main () {
    const iceCreamList = document.querySelector('.icecream-container__tray');
    const inputSlider = document.querySelector('.slidecontainer');
    const ARPrompt = document.querySelector('.ar-prompt');
    const snapshotBtn = document.querySelector('#snapshot-zappar');

    let defaultRotation = 0;
    let isTouching = false;
    let initialTouch = 0;

    iceCreamList.maxWidth = window.screen.width;
        
    const renderer = new THREE.WebGLRenderer({antialias:true, alpha: true, preserveDrawingBuffer: true});
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth/2,window.innerHeight/2, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    renderer.gammaFactor = 2.2;

    
    document.body.appendChild(renderer.domElement);

    // const fov = 75;
    // const aspect = window.innerWidth/window.innerHeight;
    // const near = 0.1;
    // const far = 500;

    //const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    //camera.position.z = 5;

    const scene = new THREE.Scene();

    //Setup Zappar
    let hasPlaced = false;

    ZapparThree.glContextSet(renderer.getContext());
    let camera = new ZapparThree.Camera();
    scene.background = camera.backgroundTexture;

    ZapparThree.permissionRequestUI().then(granted => {
        console.log(granted);
        if (granted) camera.start();
        else ZapparThree.permissionDeniedUI();
    });

    let instantWorldTracker = new ZapparThree.InstantWorldTracker();
    instantWorldTracker.setAnchorPoseFromCameraOffset(0, 0, -5);

    let instantWorldAnchorGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantWorldTracker);
    scene.add(instantWorldAnchorGroup);

    let ambient = new THREE.AmbientLight(0x656765)
    let light = new THREE.DirectionalLight(0xFFFFFFF, 1);
    light.position.set(10, 10, 5);
    
    instantWorldAnchorGroup.add(ambient);
    instantWorldAnchorGroup.add(light);

    let icecream;
    let icecreamScale = 1;

    let currentflavour;
    const iceCream = [
            {
                name: "Strawberry",
                tagName: "strawberriesAndCream",
                texture: strawberryTexture,
                svg: strawberryIcon,
                id: 0,
            },
            {
                name: "Pistachio",
                tagName: "pistachio",
                texture: pistachioTexture,
                svg: pistachioIcon,
                id: 1,
            },
            {
                name: "Mango",
                tagName: "mango",
                texture: mangoTexture,
                svg: mangoIcon,
                id: 2,
            }
    ];

    function selectIceCream (index) {
        // No action if selected already
        if (currentflavour === index && !hasPlaced) {
            return;
        }
        currentflavour = index;

        icecream.position.y = 8;


        const texture = new THREE.TextureLoader().load(
            iceCream[index].texture
        );

        icecream.material.map = texture;
        texture.flipY = false;
        texture.needsUpdate = true;

        gsap.to(icecream.position, {y: -2,duration: 1, ease:"elastic"} );
        
    }

    const generateUI = () => {

        iceCream.forEach((element, index) => {
            console.log(element);
            const entry = document.createElement('a');
            entry.className = 'item-container'
            const icon = document.createElement('img');
            icon.src = element.svg;
            const name = document.createElement('p');
            name.innerHTML = element.name

            entry.appendChild(icon);
            entry.appendChild(name);

            entry.addEventListener('click', e => {
                e.preventDefault();

                selectIceCream(index);
            });
            iceCreamList.appendChild(entry);
        });
    }

    function loadIceCream () {

        const gltfloader = new GLTFLoader();
        gltfloader.load (iceCreamURL,
                moveIceCream, (xhr) => {
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            function(error){
                console.log(error)
        });
    }

    function moveIceCream (gltf) {
        icecream = gltf.scene.children[0];
        icecream.material.specular= 0x000000;
        icecream.material.needsUpdate = true
        instantWorldAnchorGroup.add( icecream );
        icecream.position.y = 8;
        
        icecream.rotation.z = 0.2;
    }

    const rotateIceCream = e => {
        isTouching = true;

        e.preventDefault();
        const touch = e.touches[0].clientX;
        icecream.rotation.y = defaultRotation + (touch - initialTouch)*0.01;
    }


    loadIceCream();
    generateUI();

    function render () {//loop causes the renderer to draw the scene every time the screen is refreshed.
                
        requestAnimationFrame(render);//prevents the mesh from becoming distorted when resizing 

        if (icecream) {
            if (!isTouching) {
                icecream.rotation.y += 0.01;
            }

            if (icecreamScale !== icecream.scale.x) {
                icecream.scale.x = icecreamScale;
                icecream.scale.y = icecreamScale*2.345;
                icecream.scale.z = icecreamScale;
            }
        }

        if (!hasPlaced) instantWorldTracker.setAnchorPoseFromCameraOffset(0, 0, -5);
        camera.updateFrame(renderer);
        renderer.render(scene, camera);//redrawing the renderer every time
    }

    requestAnimationFrame(render);

    inputSlider.addEventListener('input', e => {
        // Avoid endless updates
        if (icecreamScale !== e.target.value / e.target.max) {
            icecreamScale = e.target.value / e.target.max;
        }
    });

    // canvas must be binded after appended
    let canvas = document.querySelector('canvas');

    canvas.addEventListener('click', placeIceCream);
    canvas.addEventListener('touchstart', placeIceCream);

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        initialTouch = e.touches[0].clientX;
    });
    
    canvas.addEventListener('touchmove', rotateIceCream);

    canvas.addEventListener('touchend', () => {
        isTouching = false;
        defaultRotation = icecream.rotation.y;
    });

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth,window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;

        //camera.updateProjectionMatrix();
    });


    function placeIceCream () {
        // If no flavour has been selected, select the first object
        if (!hasPlaced) {
            selectIceCream(0);
            ARPrompt.style.display = 'none';
            
            const texture = new THREE.TextureLoader().load(
                defaultTexture
            );
    
            icecream.material.map = texture;
            texture.flipY = false;
            texture.needsUpdate = true;
        }
        hasPlaced = true;

        canvas.removeEventListener('click', placeIceCream, false);
        canvas.removeEventListener('touchstart', placeIceCream, false);
    }

    // Zappar Sharing

    snapshotBtn.addEventListener('click', e => {
        e.preventDefault();
        let snapshotCanvas = document.querySelector('canvas');
        console.log(snapshotCanvas);
        // Convert canvas data to url
        if (canvas) {
            const url = snapshotCanvas.toDataURL('image/jpeg', 0.8);
            console.log(url);
            // Take snapshot
            ZapparSharing({
            data: url,
            });
        }
    });

}