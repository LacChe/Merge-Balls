import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import cannon from "cannon";
import { Engine, Scene, ArcRotateCamera, 
    Vector3, HemisphericLight, DirectionalLight, 
    MeshBuilder, ShadowGenerator, Color3,
    Mesh, Texture, StandardMaterial, PhysicsImpostor } from "@babylonjs/core";
import nipplejs from 'nipplejs';
import JSConfetti from 'js-confetti'

const jsConfetti = new JSConfetti()

const ballData = {
    golf: {
        size: 1,
        mass: 5000,
        upgrade: 'tennis'
    },
    tennis: {
        size: 1.5,
        mass: 5000,
        upgrade: 'cricket'
    },
    cricket: {
        size: 2,
        mass: 5000,
        upgrade: 'eightball'
    },
    eightball: {
        size: 2.5,
        mass: 5000,
        upgrade: 'softball'
    },
    softball: {
        size: 3,
        mass: 5000,
        upgrade: 'volley'
    },
    volley: {
        size: 4,
        mass: 6000,
        upgrade: 'bowling'
    },
    bowling: {
        size: 4.5,
        mass: 7000,
        upgrade: 'soccer'
    },
    soccer: {
        size: 5.5,
        mass: 8000,
        upgrade: 'basketball'
    },
    basketball: {
        size: 6.5,
        mass: 9000,
        upgrade: 'beachball'
    },
    beachball: {
        size: 8,
        mass: 10000,
        upgrade: 'win'
    }
}

const keysDown = {};
let joystick;

let playerBall;
let shadowGenerator;
let ballsToAdd = [];
const timeoutMax = 100;
let timeout = 0;
const moveDistance = 0.1;

let win = false;
let dropButton;

function initBabylon() {
    // create the canvas html element and attach it to the webpage
    let canvas = document.getElementById("game-canvas");
    // initialize babylon scene and engine
    let engine = new Engine(canvas, true);
    let scene = createScene(engine, canvas);

    // button for dropping ball
    dropButton = document.getElementById("drop-button");
    dropButton.addEventListener('click', e => {
        if(!win) dropBall();
        else {
            dropButton.innerHTML = 'Drop';
            win = false;
            scene = createScene(engine, canvas);
        }
    })
    // joystick for controlling ball with touch or mouse
    joystick = nipplejs.create({
        zone: document.getElementById('joystick-wrapper'),
        mode: 'static',
        size: 150,
        threshold: 0.01,
        position: { left: '8vh', bottom: '8vh' }
    });
    joystick.on('move', function (evt, data) {
        if(data.direction.angle === 'up'){
            keysDown[87] = true;
            keysDown[83] = false;
            keysDown[65] = false;
            keysDown[68] = false;
        }
        if(data.direction.angle === 'down'){
            keysDown[87] = false;
            keysDown[83] = true;
            keysDown[65] = false;
            keysDown[68] = false;
        }
        if(data.direction.angle === 'left'){
            keysDown[87] = false;
            keysDown[83] = false;
            keysDown[65] = true;
            keysDown[68] = false;
        }
        if(data.direction.angle === 'right'){
            keysDown[87] = false;
            keysDown[83] = false;
            keysDown[65] = false;
            keysDown[68] = true;
        }
    });
    joystick.on('end', function (evt, data) {
        keysDown[87] = false;
        keysDown[83] = false;
        keysDown[65] = false;
        keysDown[68] = false;
    });

    // resize the engine when the window is resized
    window.addEventListener('resize', function(){
        engine.resize();
    });

    window.addEventListener("keydown", (ev) => {
        // Shift+Ctrl+Alt+I
        if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
            if (scene.debugLayer.isVisible()) {
                scene.debugLayer.hide();
            } else {
                scene.debugLayer.show();
            }
        }
        if(ev.keyCode === 32 && !keysDown[32]) {
            if(!win) dropBall();
            else {
                dropButton.innerHTML = 'Drop';
                win = false;
                scene = createScene(engine, canvas);
            }
        }
        keysDown[ev.keyCode] = true;
    });
    window.addEventListener("keyup", (ev) => {
        keysDown[ev.keyCode] = false;
    });

    // run the main render loop
    engine.runRenderLoop(() => {
        scene.render();
    });
}

function createScene(engine, canvas) {
    const scene = new Scene(engine);
    window.CANNON = cannon;
    var gravityVector = new Vector3(0,-9.81, 0);
    scene.enablePhysics(gravityVector);

    const camera = new ArcRotateCamera("Camera", 0, Math.PI * 0.4, 25, new Vector3(0, 8, 0));

    camera.attachControl(canvas, true);
    camera.panningSensibility = 0;

    const hemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0));
    hemisphericLight.intensity = 0.7;
    let directionalLight = new DirectionalLight("light", new Vector3(0, -1, 0));
    directionalLight.intensity = 5;
    directionalLight.position.y = 30;

    shadowGenerator = new ShadowGenerator(1024, directionalLight);

    randomPlayerBall(4);
    buildContainer();

    scene.onBeforeRenderObservable.add((eventData) => {
        // count timeout
        if(timeout > 0) timeout--;
        // prevent scroll
        camera.lowerRadiusLimit = camera.radius;camera.upperRadiusLimit = camera.radius;
        // lock camera beta, limit alpha
        camera.beta = Math.PI * 0.4;
        if(camera.alpha > Math.PI) camera.alpha = Math.PI;
        if(camera.alpha < -Math.PI) camera.alpha = -Math.PI;
        if(playerBall){
            movePlayerBall(camera);
        }
        // add balls from previous collisions
        addBalls();
    });

    return scene;
}

function dropBall() {
    if(!playerBall || timeout > 0) return;
    timeout = timeoutMax;
    createBall(playerBall.name, playerBall.position)
    randomPlayerBall(4);
}

function handleCollision(ball1, ball2) {
    let position = ball2.position;
    let name = ballData[ball2.name].upgrade;
    ball1.dispose();
    ball2.dispose();
    ballsToAdd.push({name, position});
    if(name === 'beachball') {
        jsConfetti.addConfetti();
        dropButton.innerHTML = 'Reset';
        win = true;
    }
}

function addBalls() {
    ballsToAdd.forEach(({name, position}) => {
        createBall(name, position);
    });
    ballsToAdd = [];
}

function createBall(name, position) {
    const ball = MeshBuilder.CreateSphere(name, {segments: 32, diameter: ballData[name].size});
    const ballMat = new StandardMaterial("ballMat");
    ballMat.diffuseTexture = new Texture(`./${name}.jpg`);
    if(name !== 'bowling' && name !== 'eightball') ballMat.specularColor = new Color3(0, 0, 0);
    ball.material = ballMat;
    ball.position = position;
    ball.receiveShadows = true;
    shadowGenerator.addShadowCaster(ball, true);
    ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, { mass: ballData[name].mass, restitution: 0.9 });
    ball.physicsImpostor.onCollideEvent = function(e, t) {
        if(e.object.name === t.object.name) {
            handleCollision(e.object, t.object);
        }
    };
}

function randomPlayerBall(limit) {
    const index = Math.trunc(Math.random() * limit);
    const key = Object.keys(ballData)[index];
    const lastPos = playerBall?.position;
    playerBall?.dispose();
    playerBall = MeshBuilder.CreateSphere(key, {segments: 32, diameter: ballData[key].size});

    const ballMat = new StandardMaterial("ballMat");
    ballMat.diffuseTexture = new Texture(`./${key}.jpg`);
    if(key !== 'bowling' && key !== 'eightball') ballMat.specularColor = new Color3(0, 0, 0);
    playerBall.material = ballMat;
    if(lastPos) playerBall.position = lastPos;
    else playerBall.position.set(0, 16, 0);
    shadowGenerator.addShadowCaster(playerBall, true);
}

function movePlayerBall(camera){
    if(keysDown[87]) {
        // away from camera
        const slope = (camera.position.z)/(camera.position.x);
        let dx = (moveDistance / Math.sqrt(1 + (slope * slope)));
        let dy = slope * dx;
        playerBall.position.x = playerBall.position.x - dx * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
        playerBall.position.z = playerBall.position.z - dy * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
    }
    if(keysDown[83]){
        // to camera
        const slope = (camera.position.z)/(camera.position.x);
        let dx = (moveDistance / Math.sqrt(1 + (slope * slope)));
        let dy = slope * dx;
        playerBall.position.x = playerBall.position.x + dx * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
        playerBall.position.z = playerBall.position.z + dy * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
    }
    if(keysDown[65]){
        // left of camera
        const slope = (camera.position.z)/(camera.position.x);
        let dx = (moveDistance / Math.sqrt(1 + (slope * slope)));
        let dy = slope * dx;
        playerBall.position.x = playerBall.position.x + dy * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
        playerBall.position.z = playerBall.position.z - dx * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
    }
    if(keysDown[68]){
        // right of camera
        const slope = (camera.position.z)/(camera.position.x);
        let dx = (moveDistance / Math.sqrt(1 + (slope * slope)));
        let dy = slope * dx;
        playerBall.position.x = playerBall.position.x - dy * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
        playerBall.position.z = playerBall.position.z + dx * ((Math.abs(camera.alpha) < Math.PI / 2) ? 1 : -1);
    }
    // keep playerball within crate
    if(playerBall.position.x + ballData[playerBall.name].size / 2 > 5) playerBall.position.x = 5 - ballData[playerBall.name].size / 2;
    if(playerBall.position.x - ballData[playerBall.name].size / 2 < -5) playerBall.position.x = -5 + ballData[playerBall.name].size / 2;
    if(playerBall.position.z + ballData[playerBall.name].size / 2 > 5) playerBall.position.z = 5 - ballData[playerBall.name].size / 2;
    if(playerBall.position.z - ballData[playerBall.name].size / 2 < -5) playerBall.position.z = -5 + ballData[playerBall.name].size / 2;
}

function buildContainer() {

    const ground = MeshBuilder.CreateGround("ground", {width: 10, height: 10});
    const plane1 = MeshBuilder.CreatePlane("plane1", {height:15, width: 10});
    const plane2 = plane1.clone("plane2");
    const plane3 = plane1.clone("plane3");
    const plane4 = plane1.clone("plane4");

    const groundMat = new StandardMaterial("groundMat");
    groundMat.diffuseTexture = new Texture("./crate-bottom.jpg")
    const planeMat = new StandardMaterial("planeMat");
    planeMat.diffuseTexture = new Texture("./crate-side.jpg");

    ground.material = groundMat;
    plane1.material = planeMat;
    plane2.material = planeMat;
    plane3.material = planeMat;
    plane4.material = planeMat;

    plane1.position.z = 5;
    plane1.position.y = 7.5;

    plane2.position.z = -5;
    plane2.position.y = 7.5;
    plane2.rotation.y = Math.PI;

    plane3.position.x = 5;
    plane3.position.y = 7.5;
    plane3.rotation.y = Math.PI / 2;

    plane4.position.x = -5;
    plane4.position.y = 7.5;
    plane4.rotation.y = -Math.PI / 2;

    const container = Mesh.MergeMeshes([ground, plane1, plane2, plane3, plane4], true, false, null, false, true);
    container.receiveShadows = true;
    container.physicsImpostor = new PhysicsImpostor(container, PhysicsImpostor.MeshImpostor, { mass: 0, restitution: 0.9 });

    return container;
}

initBabylon();